import { Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../middleware/auth.middleware";
import Dataset from "../models/Dataset.model";
import { AppError } from "../middleware/error.middleware";
import { processUploadedFile } from "../services/document.service";
import { indexDocuments, getDocumentCount } from "../services/rag.service";
import logger from "../utils/logger";

export async function uploadDataset(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      next(new AppError("No file uploaded", 400));
      return;
    }

    const { name, description } = req.body;
    const ext = path
      .extname(req.file.originalname)
      .toLowerCase()
      .replace(".", "");

    const dataset = await Dataset.create({
      name: name || req.file.originalname,
      description,
      type: ext as any,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: "processing",
      uploadedBy: req.user!.userId,
    });

    // Index async (non-blocking)
    processUploadedFile(req.file.path, req.file.originalname, dataset.name)
      .then(async (docs) => {
        const count = await indexDocuments(docs);
        await Dataset.findByIdAndUpdate(dataset._id, {
          status: "indexed",
          documentCount: count,
          indexedAt: new Date(),
        });
        logger.info(`Dataset ${dataset.name} indexed: ${count} chunks`);
      })
      .catch(async (err) => {
        await Dataset.findByIdAndUpdate(dataset._id, {
          status: "error",
          errorMessage: err.message,
        });
        logger.error(`Dataset indexing failed: ${err.message}`);
      });

    res.status(201).json({
      success: true,
      message: "Dataset uploaded and indexing started",
      data: { dataset },
    });
  } catch (err) {
    next(err);
  }
}

export async function getDatasets(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [datasets, total] = await Promise.all([
      Dataset.find()
        .populate("uploadedBy", "fullName email")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Dataset.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        datasets,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        vectorStoreCount: getDocumentCount(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDataset(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dataset = await Dataset.findByIdAndDelete(req.params.id);

    if (!dataset) {
      next(new AppError("Dataset not found", 404));
      return;
    }

    // Delete file from disk
    if (fs.existsSync(dataset.filePath)) {
      fs.unlinkSync(dataset.filePath);
    }

    res.json({ success: true, message: "Dataset deleted" });
  } catch (err) {
    next(err);
  }
}

export async function reindexDataset(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dataset = await Dataset.findById(req.params.id);

    if (!dataset) {
      next(new AppError("Dataset not found", 404));
      return;
    }

    if (!fs.existsSync(dataset.filePath)) {
      next(new AppError("File not found on disk", 404));
      return;
    }

    await Dataset.findByIdAndUpdate(dataset._id, { status: "processing" });

    processUploadedFile(dataset.filePath, dataset.name, dataset.name)
      .then(async (docs) => {
        const count = await indexDocuments(docs);
        await Dataset.findByIdAndUpdate(dataset._id, {
          status: "indexed",
          documentCount: count,
          indexedAt: new Date(),
        });
      })
      .catch(async (err) => {
        await Dataset.findByIdAndUpdate(dataset._id, {
          status: "error",
          errorMessage: err.message,
        });
      });

    res.json({ success: true, message: "Re-indexing started" });
  } catch (err) {
    next(err);
  }
}
