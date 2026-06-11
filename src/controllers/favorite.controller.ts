import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import Favorite from "../models/Favorite.model";
import Conversation from "../models/Conversation.model";
import { AppError } from "../middleware/error.middleware";

export async function addFavorite(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId, note } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user!.userId,
    });

    if (!conversation) {
      next(new AppError("Conversation not found", 404));
      return;
    }

    const favorite = await Favorite.create({
      userId: req.user!.userId,
      conversationId,
      note,
    });

    res.status(201).json({ success: true, data: { favorite } });
  } catch (err: any) {
    if (err.code === 11000) {
      next(new AppError("Already in favorites", 409));
      return;
    }
    next(err);
  }
}

export async function getFavorites(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [favorites, total] = await Promise.all([
      Favorite.find({ userId: req.user!.userId })
        .populate({
          path: "conversationId",
          select: "question answer sources createdAt",
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Favorite.countDocuments({ userId: req.user!.userId }),
    ]);

    res.json({
      success: true,
      data: {
        favorites,
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

export async function removeFavorite(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const favorite = await Favorite.findOneAndDelete({
      _id: req.params.id,
      userId: req.user!.userId,
    });

    if (!favorite) {
      next(new AppError("Favorite not found", 404));
      return;
    }

    res.json({ success: true, message: "Removed from favorites" });
  } catch (err) {
    next(err);
  }
}

export async function checkFavorite(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const favorite = await Favorite.findOne({
      userId: req.user!.userId,
      conversationId: req.params.conversationId,
    });

    res.json({
      success: true,
      data: {
        isFavorite: !!favorite,
        favoriteId: favorite?._id,
      },
    });
  } catch (err) {
    next(err);
  }
}
