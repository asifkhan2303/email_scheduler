import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  cancelScheduled,
  getEmail,
  getScheduled,
  getSenders,
  getSent,
  getStats,
  scheduleEmails
} from "../controllers/email.controller";

const router = Router();

router.use(authMiddleware);

router.post("/schedule", scheduleEmails);
router.get("/scheduled", getScheduled);
router.get("/sent", getSent);
router.get("/stats", getStats);
router.get("/senders", getSenders);
router.get("/:id", getEmail);
router.delete("/:id", cancelScheduled);

export default router;
