import { Router } from "express";
import { body } from "express-validator";
import * as dataset from "../controllers/dataset.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { uploadMiddleware } from "../middleware/upload.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", dataset.getDatasets);

router.post(
  "/upload",
  uploadMiddleware.single("file"),
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  validate,
  dataset.uploadDataset,
);

router.delete("/:id", dataset.deleteDataset);
router.post("/:id/reindex", dataset.reindexDataset);

export default router;
