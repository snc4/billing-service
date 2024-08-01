import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';

import { dataSourceOptions } from 'src/db/typeorm.config';

import { SendActiveSubs } from './executables/send-active-subs-to-aggr.script';

@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions), ConfigModule],
  providers: [SendActiveSubs],
})
export class ScriptsModule {
  constructor(private dataSource: DataSource) {}
}
