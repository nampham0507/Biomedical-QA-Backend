import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { answerBiomedicalQuestion } from "../services/rag.service";
import Conversation from "../models/Conversation.model";
import { AppError } from "../middleware/error.middleware";

export async function askQuestion(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { question, sessionId } = req.body;

    if (!question?.trim()) {
      next(new AppError("Question is required", 400));
      return;
    }

    const result = await answerBiomedicalQuestion(question.trim());

    const conversation = await Conversation.create({
      userId: req.user!.userId,
      question: question.trim(),
      answer: result.answer,
      sources: result.sources,
      sessionId,
      tokensUsed: result.tokensUsed,
      processingTime: result.processingTime,
    });

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation._id,
        question: conversation.question,
        answer: result.answer,
        sources: result.sources,
        processingTime: result.processingTime,
        tokensUsed: result.tokensUsed,
      },
    });
  } catch (err) {
    next(err);
  }
}
