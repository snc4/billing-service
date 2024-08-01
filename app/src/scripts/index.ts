import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ScriptsModule } from './scripts.module';
import { executables } from './executables';

async function bootstrap() {
  const logger = new Logger('cli-scripts');

  const scriptName = process.argv[2];
  const application = await NestFactory.createApplicationContext(ScriptsModule);
  const script = executables[scriptName];

  try {
    if (!script) {
      throw new Error(`script with name: ${scriptName} doesnt exist!`);
    }

    logger.log(`Launched "${scriptName}" script ...`);

    await script.run();

    logger.log(`"${scriptName}" script executed`);
  } catch (error) {
    logger.error(error);
  }

  await application.close();
}

bootstrap().catch(console.error);
