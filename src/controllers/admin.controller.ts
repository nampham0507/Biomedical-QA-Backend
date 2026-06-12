import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/User.model";
import { AppError } from "../middleware/error.middleware";

export async function getUsers(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const role = req.query.role as string;

    const filter: any = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { isActive } = req.body;
    const targetId = req.params.id;

    if (targetId === req.user!.userId) {
      next(new AppError("Cannot deactivate your own account", 400));
      return;
    }

    const user = await User.findByIdAndUpdate(
      targetId,
      { isActive },
      { new: true },
    );

    if (!user) {
      next(new AppError("User not found", 404));
      return;
    }

    res.json({ success: true, message: "User status updated", data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { role } = req.body;
    const targetId = req.params.id;

    if (targetId === req.user!.userId) {
      next(new AppError("Cannot change your own role", 400));
      return;
    }

    const user = await User.findByIdAndUpdate(
      targetId,
      { role },
      { new: true },
    );

    if (!user) {
      next(new AppError("User not found", 404));
      return;
    }

    res.json({ success: true, message: "User role updated", data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetId = req.params.id;

    if (targetId === req.user!.userId) {
      next(new AppError("Cannot delete your own account", 400));
      return;
    }

    const user = await User.findByIdAndDelete(targetId);

    if (!user) {
      next(new AppError("User not found", 404));
      return;
    }

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    next(err);
  }
}
