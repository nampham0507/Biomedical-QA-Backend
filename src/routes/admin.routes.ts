import { Router } from "express";
import { body } from "express-validator";
import * as admin from "../controllers/admin.controller";
import * as analytics from "../controllers/analytics.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.use(authenticate, authorize("admin"));

// Users
router.get("/users", admin.getUsers);

router.patch(
  "/users/:id/status",
  body("isActive").isBoolean().withMessage("isActive must be boolean"),
  validate,
  admin.updateUserStatus,
);

router.patch(
  "/users/:id/role",
  body("role")
    .isIn(["user", "admin"])
    .withMessage("Role must be user or admin"),
  validate,
  admin.updateUserRole,
);

router.delete("/users/:id", admin.deleteUser);

// Analytics
router.get("/analytics/overview", analytics.getOverview);
router.get("/analytics/activity", analytics.getActivityChart);
router.get("/analytics/top-users", analytics.getTopUsers);

export default router;
