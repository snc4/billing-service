import { ConfigService } from '@nestjs/config';

import { Executable } from './executable.interface';
import { SendActiveSubs } from './send-active-subs-to-aggr.script';

const configService = new ConfigService();

export const executables: { [key: string]: Executable } = {
  'send-active-subs': new SendActiveSubs(configService),
};
