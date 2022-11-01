import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/entities/user.entity';
import { ProductsService } from 'src/products/products.service';
import { Repository } from 'typeorm';
import { initialData } from './data/seed-data';


@Injectable()
export class SeedService {
  constructor(
    private readonly productService: ProductsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) { }

  async runSeed() {
    await this.deleteTables();
    const adminUser = await this.insertUsers();
    await this.insertNewProducts(adminUser);
    return 'Seed executed'
  }

  private async insertUsers() {
    const seedUsers = initialData.users;
    const users: User[] = [];
    seedUsers.forEach(user => {
      users.push(this.userRepository.create(user))
    });

    const dbUsers = await this.userRepository.save(seedUsers)
    return dbUsers[0] ;
  }

  private async deleteTables() {
    await this.productService.deleteAllProducts();
    const queryBuilder = this.userRepository.createQueryBuilder();
    await queryBuilder.delete().where({}).execute();
  }

  private async insertNewProducts(user: User) {
    await this.productService.deleteAllProducts()
    const products = initialData.products;
    const insertPromises = [];
    products.forEach(product => {
      insertPromises.push(this.productService.create(product, user))
    })
    await Promise.all(insertPromises);
    return true
  }
}
