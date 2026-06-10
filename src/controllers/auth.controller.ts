import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import User from '../models/User.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendPasswordResetEmail } from '../utils/email';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

// ── Register ───────────────────────────────────────────────────
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { fullName, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      next(new AppError('Email already in use', 409));
      return;
    }

    const user = await User.create({ fullName, email, password, role: 'user' });

    const payload = {
      userId: String(user._id),
      role: user.role,
      email: user.email,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ── Login ──────────────────────────────────────────────────────
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      next(new AppError('Invalid email or password', 401));
      return;
    }

    if (!user.isActive) {
      next(new AppError('Account is deactivated', 403));
      return;
    }

    const payload = {
      userId: String(user._id),
      role: user.role,
      email: user.email,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login successful',
      data: { user, accessToken, refreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ── Refresh Token ──────────────────────────────────────────────
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      next(new AppError('Refresh token required', 400));
      return;
    }

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.userId).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      next(new AppError('Invalid refresh token', 401));
      return;
    }

    const newPayload = {
      userId: String(user._id),
      role: user.role,
      email: user.email,
    };

    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ── Logout ─────────────────────────────────────────────────────
export async function logout(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user.userId, {
        $unset: { refreshToken: 1 },
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ── Forgot Password ────────────────────────────────────────────
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
      });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    user.resetPasswordExpires = new Date(Date.now() + 3600000);

    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(user.email, token);

    res.json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

// ── Reset Password ─────────────────────────────────────────────
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      next(new AppError('Invalid or expired reset token', 400));
      return;
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. Please login.',
    });
  } catch (err) {
    next(err);
  }
}

// ── Get Me ─────────────────────────────────────────────────────
export async function getMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId);

    if (!user) {
      next(new AppError('User not found', 404));
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}
