import { Router } from "express";
import {
    getComments,
    addnewComment,
    updateDislikedComments,
    updatelikedComments
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"
const router = Router();



router.route("/get-comments").post(verifyJWT,getComments);
router.route("/new-comment").post(verifyJWT,addnewComment);
router.route("/updateLikes").post(verifyJWT,updatelikedComments);
router.route("/updateDislikes").post(verifyJWT,updateDislikedComments);

export default router;