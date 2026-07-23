import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { LoggerService } from './logger.service';
import { loggerConfig } from './logger.config';

@Global()
@Module({
    imports: [
        PinoLoggerModule.forRoot(loggerConfig),
    ],
    providers: [LoggerService],
    exports: [LoggerService],
})
export class LoggerModule {}