import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Conversation from "../models/Conversation.model";
import { AppError } from "../middleware/error.middleware";

export async function getConversations(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const filter: any = { userId: req.user!.userId };
    if (search) filter.$text = { $search: search };

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-sources.content"),
      Conversation.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user!.userId,
    });

    if (!conversation) {
      next(new AppError("Conversation not found", 404));
      return;
    }

    res.json({ success: true, data: { conversation } });
  } catch (err) {
    next(err);
  }
}

export async function deleteConversation(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.userId,
    });

    if (!conversation) {
      next(new AppError("Conversation not found", 404));
      return;
    }

    res.json({ success: true, message: "Conversation deleted" });
  } catch (err) {
    next(err);
  }
}

export async function deleteAllConversations(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await Conversation.deleteMany({ userId: req.user!.userId });
    res.json({ success: true, message: "All conversations deleted" });
  } catch (err) {
    next(err);
  }
}
