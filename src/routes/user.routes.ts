import { Router } from "express";
import { body } from "express-validator";
import * as user from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.use(authenticate);

router.get("/profile", user.getProfile);

router.patch(
  "/profile",
  body("fullName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Full name cannot be empty")
    .isLength({ max: 100 }),
  validate,
  user.updateProfile,
);

router.post(
  "/change-password",
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
  validate,
  user.changePassword,
);

export default router;
