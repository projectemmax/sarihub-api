import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
    pinoHttp: {
        level: process.env.NODE_ENV === 'production'
            ? 'info'
            : 'debug',

        transport:
            process.env.NODE_ENV === 'production'
                ? undefined
                : {
                    target: 'pino-pretty',
                    options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    singleLine: true,
                    },
                },


        redact: {
            paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.headers["set-cookie"]',
            ],
            remove: true,
        },

        serializers: {
            req(req) {
                return {
                    id: req.id,
                    method: req.method,
                    url: req.url,
                    ip: req.remoteAddress,
                    userAgent: req.headers['user-agent'],
                };
            },
            res(res) {
                return {
                    statusCode: res.statusCode,
                };
            },
        },

    },
};