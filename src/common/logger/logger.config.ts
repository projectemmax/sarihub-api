import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
    pinoHttp: {
        transport:
        process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                    singleLine: true,
                    colorize: true,
                    translateTime: 'SYS:standard',
                },
            },

        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
};