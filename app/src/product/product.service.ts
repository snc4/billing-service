import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from 'src/db/entities/product.entity';

@Injectable()
export default class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>
  ) {}

  async getProductByCode(productCode: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { productCode } });

    if (!product) {
      throw new Error(`product with productCode: ${productCode} not found!`);
    }

    return product;
  }

  async createProduct(productCode: string, name: string, options: any | null): Promise<Product> {
    const existingProduct = await this.productRepository.findOne({
      where: { productCode },
    });

    if (existingProduct) {
      throw new Error(`product with code: ${productCode} already exist!`);
    }

    const withOptions = options ? { options } : {};

    return await this.productRepository.save({
      productCode,
      name,
      ...withOptions,
    });
  }
}
