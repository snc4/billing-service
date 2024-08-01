import { Inject, Injectable, Logger as BaseLogger } from '@nestjs/common';
import { Logger, PARAMS_PROVIDER_TOKEN, Params, PinoLogger } from 'nestjs-pino';

@Injectable()
export abstract class AbstractLogger extends Logger {
  public context: string;

  constructor(logger: PinoLogger, @Inject(PARAMS_PROVIDER_TOKEN) params: Params) {
    super(logger, params);
  }

  public verbose(message: any, additionalData: { [key: string]: any }, ...optionalParams: any[]) {
    super.verbose(
      { application: this.context, ...additionalData },
      Object.keys(message).length ? JSON.stringify(message) : message,
      ...optionalParams
    );
    BaseLogger.flush();
  }

  public debug(message: any, additionalData: { [key: string]: any }, ...optionalParams: any[]) {
    super.debug(
      { application: this.context, ...additionalData },
      Object.keys(message).length ? JSON.stringify(message) : message,
      ...optionalParams
    );
    BaseLogger.flush();
  }

  public log(message: any, additionalData: { [key: string]: any }, ...optionalParams: any[]) {
    const [loggerOptions] = optionalParams;

    if (
      typeof loggerOptions === 'object' &&
      'flushImmediately' in loggerOptions &&
      loggerOptions.flushImmediately === true
    ) {
      super.log(
        {
          application: this.context,
          ...(additionalData !== loggerOptions && additionalData),
        },
        Object.keys(message).length ? JSON.stringify(message) : message,
        additionalData,
        ...optionalParams
      );
      BaseLogger.flush();
    } else {
      super.log(
        {
          application: this.context,
          ...(typeof additionalData !== 'string' && additionalData),
        },
        Object.keys(message).length ? JSON.stringify(message) : message,
        additionalData,
        ...optionalParams
      );
    }
  }

  public warn(message: any, additionalData: { [key: string]: any }, ...optionalParams: any[]) {
    super.warn(
      {
        application: this.context,
        ...(typeof additionalData !== 'string' && additionalData),
      },
      Object.keys(message).length ? JSON.stringify(message) : message,
      additionalData,
      ...optionalParams
    );
    BaseLogger.flush();
  }

  public error(message: any, additionalData: { [key: string]: any }, ...optionalParams: any[]) {
    super.error(
      {
        application: this.context,
        ...(typeof additionalData !== 'string' && additionalData),
      },
      Object.keys(message).length ? JSON.stringify(message) : message,
      ...optionalParams
    );
    BaseLogger.flush();
  }

  public fatal(message: any, additionalData: { [key: string]: any }, ...optionalParams: any[]) {
    super.fatal(
      {
        application: this.context,
        ...(typeof additionalData !== 'string' && additionalData),
      },
      Object.keys(message).length ? JSON.stringify(message) : message,
      additionalData,
      ...optionalParams
    );
    BaseLogger.flush();
  }
}
