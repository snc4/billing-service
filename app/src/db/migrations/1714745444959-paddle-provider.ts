import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaddleProvider1714745444959 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("INSERT INTO payment_provider(name) VALUES('paddle')");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM payment_provider WHERE name = 'paddle'");
  }
}
