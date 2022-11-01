import { ApiProperty } from "@nestjs/swagger";
import { User } from "src/auth/entities/user.entity";
import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ProductImage } from "./product-image.entity";

@Entity({ name: 'products' })
export class Product {
  @ApiProperty({
    example: '06ddf0cc-7806-4e4b-b235-7a56790f2bf6',
    description: 'Product ID',
    uniqueItems: true
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Womens Chill Half Zip Cropped Hoodie',
    description: 'Product title',
    uniqueItems: true
  })
  @Column('text', { unique: true })
  title: string;

  @ApiProperty(
    {
      example: 199,
      description: 'Product price',
    }
  )
  @Column('float', { default: 0 })
  price: number;

  @ApiProperty(
    {
      example: 'Et velit dolor cupidatat ex officia ex mollit officia dolore duis officia deserunt.',
      description: 'Product description',
      default: null
    }
  )
  @Column('text', { nullable: true })
  description: string;

  @ApiProperty(
    {
      example: 'womens_chill_half_zip_cropped_hoodie',
      description: 'Product SLUG - for SEO',
      uniqueItems: true
    }
  )
  @Column('text', { unique: true })
  slug: string;

  @ApiProperty(
    {
      example: 1,
      description: 'Product stock',
      default: 0
    }
  )
  @Column('int', { default: 0 })
  stock: number

  @ApiProperty(
    {
      example: ['M', 'XL', '2XL'],
      description: 'Product sizes',
    }
  )
  @Column('text', { array: true })
  sizes: string[];

  @ApiProperty(
    {
      example: 'women',
      description: 'Product gender',
    }
  )
  @Column('text')
  gender: string

  @ApiProperty()
  @Column('text', {
    array: true,
    default: []
  })
  tags: string[];

  // Relacion de uno a muchos
  @ApiProperty()
  @OneToMany(
    () => ProductImage,
    (productImage) => productImage.product,
    { cascade: true, eager: true }
  )
  images?: ProductImage[];

  @ManyToOne(
    () => User,
    (user) => user.product,
    { eager: true }
  )
  user: User

  @BeforeInsert()
  checkSlugInsert() {
    if (!this.slug) this.slug = this.title
    this.slug = this.slug.toLowerCase().replaceAll(' ', '_').replaceAll("'", '')
  }

  @BeforeUpdate()
  checkSlugUpdate() {
    this.slug = this.slug.toLowerCase().replaceAll(' ', '_').replaceAll("'", '')
  }
}
