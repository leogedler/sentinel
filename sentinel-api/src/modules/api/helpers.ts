import { Router, type RouterOptions, type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { ZodError } from 'zod';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function wrapAsync(fn: RequestHandler | AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
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

export function createRouter(options?: RouterOptions): Router {
  const router = Router(options);

  for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
    const original = router[method].bind(router);
    (router as any)[method] = (path: any, ...handlers: (RequestHandler | AsyncHandler)[]) => {
      return (original as any)(path, ...handlers.map(wrapAsync));
    };
  }

  return router;
}
