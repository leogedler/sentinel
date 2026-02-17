import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from './middleware/error.middleware';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch((err) => {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        });
        return;
      }
      next(err);
    });
  };
}
