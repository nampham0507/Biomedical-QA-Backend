import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import User from "../models/User.model";
import Conversation from "../models/Conversation.model";
import Dataset from "../models/Dataset.model";
import Favorite from "../models/Favorite.model";
import { getDocumentCount } from "../services/rag.service";

export async function getOverview(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const [totalUsers, totalConversations, totalDatasets, totalFavorites] =
      await Promise.all([
        User.countDocuments(),
        Conversation.countDocuments(),
        Dataset.countDocuments(),
        Favorite.countDocuments(),
      ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [newUsers, newConversations] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Conversation.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    res.json({
      success: true,
      data: {
        totals: {
          users: totalUsers,
          conversations: totalConversations,
          datasets: totalDatasets,
          favorites: totalFavorites,
          vectorDocuments: getDocumentCount(),
        },
        last30Days: {
          newUsers,
          newConversations,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getActivityChart(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const conversations = await Conversation.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
          avgTokens: { $avg: "$tokensUsed" },
          avgProcessingTime: { $avg: "$processingTime" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const users = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: { conversations, users },
    });
  } catch (err) {
    next(err);
  }
}

export async function getTopUsers(
  _req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const topUsers = await Conversation.aggregate([
      {
        $group: {
          _id: "$userId",
          conversationCount: { $sum: 1 },
          totalTokens: { $sum: "$tokensUsed" },
        },
      },
      { $sort: { conversationCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          fullName: "$user.fullName",
          email: "$user.email",
          conversationCount: 1,
          totalTokens: 1,
        },
      },
    ]);

    res.json({ success: true, data: { topUsers } });
  } catch (err) {
    next(err);
  }
}
