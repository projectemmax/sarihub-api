import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { LogContext } from './logger.types';

@Injectable()
export class LoggerService {
    constructor(private readonly logger: PinoLogger) {}

    info(message: string, context?: LogContext) {
        this.logger.info(context ?? {}, message);
    }

    warn(message: string, context?: LogContext) {
        this.logger.warn(context ?? {}, message);
    }

    error(
        message: string,
        error?: unknown,
        context?: LogContext,
    ) {
        this.logger.error(
        {
            error,
            ...context,
        },
        message,
        );
    }

    debug(message: string, context?: LogContext) {
        this.logger.debug(context ?? {}, message);
    }
}