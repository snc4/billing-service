import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class DefaultPaymentProvider1714744971421 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'payment_provider',
      new TableColumn({
        name: 'is_default',
        type: 'boolean',
        isNullable: false,
        default: false,
      })
    );
    await queryRunner.query("UPDATE payment_provider SET is_default = true WHERE name = 'stripe'");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('payment_provider', 'is_default');
  }
}
