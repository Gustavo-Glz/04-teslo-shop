import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid'
import { Product, ProductImage } from './entities';
import { User } from 'src/auth/entities/user.entity';


@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService')
  //Patron repositorio: Encargado de interactuar con la BD
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
  ) { }
  
  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { images = [], ...productDetails } = createProductDto
      const product = this.productRepository.create({
        ...productDetails,
        images: images.map(image => this.productImageRepository.create({ url: image })),
        user
      });
      await this.productRepository.save(product);
      return { ...product, images }
    } catch (error) {
      this.handleDBExceptions(error)
    }
  }

  //TODO: Paginar
  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto
    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      //TODO: Relaciones
      relations: {
        images: true
      }
    });
    return products.map(product => ({
      ...product,
      images: product.images.map(img => img.url)
    }))
  }

  async findOne(term: string) {
    let product: Product
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term })
    } else {
      //TODO: QueryBuilder para busqueda por title o slug
      const queryBuilder = this.productRepository.createQueryBuilder('prod');
      product = await queryBuilder.where('UPPER(title) =:title or slug=:slug', {
        title: term.toUpperCase(),
        slug: term.toLowerCase()
      }).leftJoinAndSelect('prod.images', 'prodImages').getOne();
    }
    if (!product) throw new NotFoundException(`Product with "${term}" not found`)
    return product
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term)
    return {
      ...rest,
      images: images.map(image => image.url)
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const { images, ...toUpdate } = updateProductDto;
    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate,
    });

    if (!product) throw new NotFoundException(`Product with "${id}" not found`)

    // Create query runner
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        // Borramos las imagenes anteriores
        await queryRunner.manager.delete(ProductImage, { product: { id } })
        product.images = images.map(image => this.productImageRepository.create({ url: image }))
      }
      product.user = user
      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      //await this.productRepository.save(product)
      return this.findOnePlain(id)

    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBExceptions(error)
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id)
    await this.productRepository.remove(product)
  }


  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.default);
    this.logger.error(error)
    throw new InternalServerErrorException('Unexpected error, check server logs')
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');
    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}