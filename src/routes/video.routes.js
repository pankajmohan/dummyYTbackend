import { Router } from "express";
import {
    addNewVideo,
    getAllMyVideos,
    getAllVideos,
    playTheVideo,
    increaseViewandUpdateWatchHistory,
    updateLikes,
    updateDislikes,
    getRelatedVideos,
    getWatchedVideos,
    getLikedVideos,
    removeVideo
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

router.route("/v/:videoId").get(playTheVideo);
router.route("/get-all-video-list").post(verifyJWT,getAllVideos);
router.route("/get-related-video-list").post(verifyJWT,getRelatedVideos);
router.route("/get-liked-video-list").post(verifyJWT,getLikedVideos);
router.route("/get-watched-video-list").post(verifyJWT,getWatchedVideos);
router.route("/increase-view").patch(verifyJWT,increaseViewandUpdateWatchHistory);
router.route("/deleteVideo").post(verifyJWT,removeVideo);
//likes
router.route("/updateLikes").post(verifyJWT,updateLikes);
router.route("/updateDislikes").post(verifyJWT,updateDislikes);


export default router;