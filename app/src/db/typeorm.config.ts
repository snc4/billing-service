import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const configService = new ConfigService();

export const dataSourceOptions = {
  type: 'postgres',
  host: configService.get('DB_HOST'),
  port: 5432,
  username: 'root',
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_NAME'),
  synchronize: false,
  migrations: [`${__dirname}/../**/migrations/*{.ts,.js}`],
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  logging: configService.get('NODE_ENV') === 'development',
  logger: 'advanced-console',
} as DataSourceOptions;

export default new DataSource(dataSourceOptions);
