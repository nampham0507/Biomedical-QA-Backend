import { Router } from "express";
import { body } from "express-validator";
import { askQuestion } from "../controllers/qa.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

// POST /api/qa/ask
router.post(
  "/ask",
  authenticate,
  authorize("user", "admin"),
  body("question")
    .trim()
    .notEmpty()
    .withMessage("Question is required")
    .isLength({ min: 5, max: 1000 })
    .withMessage("Question must be between 5 and 1000 characters"),
  validate,
  askQuestion,
);

export default router;
