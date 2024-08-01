import { Table, QueryRunner, MigrationInterface, TableColumnOptions } from 'typeorm';

export class Init1708334221192 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const autoincrementIdColumn: TableColumnOptions = {
      name: 'id',
      type: 'int',
      isPrimary: true,
      isGenerated: true,
      generationStrategy: 'increment',
    };

    await queryRunner.createTable(
      new Table({
        name: 'customer',
        columns: [autoincrementIdColumn, { name: 'uid', type: 'varchar', isUnique: true }],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'payment_provider',
        columns: [
          autoincrementIdColumn,
          {
            name: 'name',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'product',
        columns: [
          autoincrementIdColumn,
          {
            name: 'product_code',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'options',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'subscription',
        columns: [
          autoincrementIdColumn,
          {
            name: 'subscription_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'next_billing_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'customer_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'product_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'payment_provider_id',
            type: 'int',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            name: 'fk_subscription_customer',
            columnNames: ['customer_id'],
            referencedTableName: 'customer',
            referencedColumnNames: ['id'],
          },
          {
            name: 'fk_subscription_product',
            columnNames: ['product_id'],
            referencedTableName: 'product',
            referencedColumnNames: ['id'],
          },
          {
            name: 'fk_subscription_provider',
            columnNames: ['payment_provider_id'],
            referencedTableName: 'payment_provider',
            referencedColumnNames: ['id'],
          },
        ],
      }),
      true
    );

    await queryRunner.createTable(
      new Table({
        name: 'payment_log',
        columns: [
          autoincrementIdColumn,
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'data',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'subscription_id',
            type: 'int',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            name: 'fk_payment_log_subscription',
            columnNames: ['subscription_id'],
            referencedTableName: 'subscription',
            referencedColumnNames: ['id'],
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // drop foreign keys
    await queryRunner.query('ALTER TABLE subscription DROP CONSTRAINT fk_subscription_customer');
    await queryRunner.query('ALTER TABLE subscription DROP CONSTRAINT fk_subscription_product');
    await queryRunner.query('ALTER TABLE subscription DROP CONSTRAINT fk_subscription_provider');
    await queryRunner.query('ALTER TABLE payment_log DROP CONSTRAINT fk_payment_log_subscription');

    await queryRunner.query('DROP TABLE payment_log');
    await queryRunner.query('DROP TABLE customer');
    await queryRunner.query('DROP TABLE subscription');
    await queryRunner.query('DROP TABLE product');
    await queryRunner.query('DROP TABLE payment_provider');
  }
}
