import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_code' })
  productCode: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb' })
  options: any;
}
