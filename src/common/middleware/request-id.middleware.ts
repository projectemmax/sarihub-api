import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    use(req: Request & { id?: string }, res: Response, next: NextFunction) {
        if (req.id) {
        res.setHeader('X-Request-ID', String(req.id));
        }

        next();
    }
}