import { Router } from "express";
import {
    addNewVideo,
    getAllMyVideos,
    getAllVideos
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
const router = Router();



router.route("/new-video").post(verifyJWT,
    upload.fields([
        {
            name: "newVideo",
            maxCount: 1
        }, {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    addNewVideo
);
router.route("/get-my-video-list").get(verifyJWT,getAllMyVideos);

router.route("/new-video").post(verifyJWT,
    upload.fields([
        {
            name: "newVideo",
            maxCount: 1
        }, {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    addNewVideo
);
router.route("/get-all-video-list").get(verifyJWT,getAllVideos);


export default router;