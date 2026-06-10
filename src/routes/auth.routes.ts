import { Router } from 'express';
import { body } from 'express-validator';
import * as auth from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 }),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  validate,
  auth.register
);

// POST /api/auth/login
router.post(
  '/login',
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate,
  auth.login
);

// POST /api/auth/refresh-token
router.post(
  '/refresh-token',
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  validate,
  auth.refreshToken
);

// POST /api/auth/logout
router.post('/logout', authenticate, auth.logout);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  body('email')
    .isEmail()
    .normalizeEmail(),
  validate,
  auth.forgotPassword
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  validate,
  auth.resetPassword
);

// GET /api/auth/me
router.get('/me', authenticate, auth.getMe);

export default router;
