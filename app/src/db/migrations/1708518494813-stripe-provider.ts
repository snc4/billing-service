import { MigrationInterface, QueryRunner } from 'typeorm';

export class StripeProvider1708518494813 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("INSERT INTO payment_provider(name) VALUES('stripe')");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM payment_provider WHERE name = 'stripe'");
  }
}
