import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

export function validate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join('; ');
    return next(new AppError(message, 422));
  }
  next();
}
