import { Router } from "express";
import * as conv from "../controllers/conversation.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", conv.getConversations);
router.get("/:id", conv.getConversation);
router.delete("/all", conv.deleteAllConversations);
router.delete("/:id", conv.deleteConversation);

export default router;
