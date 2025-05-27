import { Router } from "express";
import {
    subscribeTheChannel,
    unSubscribeTheChannel
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"
const router = Router();


router.route("/subscribe-user/:channelId").get(verifyJWT, subscribeTheChannel);
router.route("/unsubscribe-user/:channelId").get(verifyJWT, unSubscribeTheChannel);

export default router;