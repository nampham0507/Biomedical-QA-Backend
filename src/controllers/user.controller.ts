import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/User.model";
import { AppError } from "../middleware/error.middleware";

export async function getProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) {
      next(new AppError("User not found", 404));
      return;
    }
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { fullName, avatar } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { fullName, avatar },
      { new: true, runValidators: true },
    );

    if (!user) {
      next(new AppError("User not found", 404));
      return;
    }

    res.json({ success: true, message: "Profile updated", data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user!.userId).select("+password");
    if (!user) {
      next(new AppError("User not found", 404));
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      next(new AppError("Current password is incorrect", 401));
      return;
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}
