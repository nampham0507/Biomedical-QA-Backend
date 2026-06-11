import { Router } from "express";
import { body } from "express-validator";
import * as fav from "../controllers/favorite.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  body("conversationId")
    .notEmpty()
    .isMongoId()
    .withMessage("Valid conversationId required"),
  validate,
  fav.addFavorite,
);

router.get("/", fav.getFavorites);
router.get("/check/:conversationId", fav.checkFavorite);
router.delete("/:id", fav.removeFavorite);

export default router;
