import { ConfigService } from '@nestjs/config';

function getPinoLogstashConfig(config: ConfigService) {
  return {
    target: 'pino-socket',
    options: {
      address: config.get('LOGSTASH_ADDRESS'),
      port: config.get('LOGSTASH_PORT'),
      mode: 'tcp',
      reconnect: true,
      recovery: true,
    },
  };
}

export function getPinoConfig() {
  return {
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      pinoHttp: {
        quietReqLogger: true,
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                colorizeObjects: true,
              },
            },
            ...(config.get('NODE_ENV') === 'production' ? [getPinoLogstashConfig(config)] : []),
          ],
        },
      },
    }),
  };
}
