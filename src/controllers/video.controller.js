import dotenv from "dotenv";
import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import getVideoDuration from "../utils/getVideoDuration.js"
import { User } from "../models/user.model.js"
import { View } from "../models/view.model.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"
import { Dislike } from "../models/dislike.model.js"
import { uploadOnCloudinary, removeOnCloudinary } from "../utils/cloudinary.js"
import mongoose, { Mongoose } from "mongoose";
dotenv.config({
    // path:'./.env'
})

const addNewVideo = asyncHandler(async (req, res) => {

    const { title, description, isPublished, tags } = req.body

    if (
        [title, description].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }
    const videoLocalPath = req.files?.newVideo[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "File is missing")
    }

    const duration = await getVideoDuration(videoLocalPath);

    // console.log("duration:",duration)

    const video = await uploadOnCloudinary(videoLocalPath);

    if (!video.url) {
        throw new ApiError(501, "Error uploading Video to cloudinary")
    }

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "File is missing")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    // console.log(thumbnail);
    if (!thumbnail.url) {
        throw new ApiError(501, "Error uploading Thumbnail to cloudinary")
    }

    // const user = await User.findByIdAndUpdate(
    //     req.user?._id,
    //     {
    //         $set: {
    //             avatar: avatar.url
    //         }
    //     }
    // ).select("-password");
    // console.log(req.body)
    const newVideo = await Video.create({
        public_Video: video?.public_id,
        public_Thumb: thumbnail?.public_id,
        videoFile: video?.url,
        thumbnail: thumbnail?.url,
        title,
        description,
        duration,
        view: 0,
        isPublished,
        owner: req.user._id,
        tags: Array.isArray(tags) ? tags : tags?.split(',').map(tag => tag.trim()),
    })
    if (!newVideo) {
        throw new ApiError(500, "Something went wrong while uploading the video")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200,
                ""
                , "Video uploaded Successfully")
        )
})
const getAllMyVideos = asyncHandler(async (req, res) => {

    const userId = req.user._id;

    const videos = await Video.aggregate({ owner: userId });

    if (!videos) {
        throw new ApiError(500, "Something went wrong while getting list of videos")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200,
                { videos },
                "Videos fetched Successfully"
            )
        )

})


const getAllVideos = asyncHandler(async (req, res) => {

    // const video = await Video.findById(req.videoId)
    const videos = await Video.aggregate([
        {
            $match: {
                isPublished: true,
                owner: { $ne: req.user._id }
            }
        }, {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerInfo"

            }
        }, {
            $lookup: {
                from: "views",
                localField:"_id",
                foreignField:"viewedfile",
                as:"view"

            }
        }, {
            $unwind: "$ownerInfo"
        }, {
            $addFields:{
                viewCount: { $size: "$view" }
            }
        },{
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                viewCount: 1,
                createdAt: 1,
                duration: 1,
                "ownerInfo._id": 1,
                "ownerInfo.username": 1,
                "ownerInfo.fullName": 1,
                "ownerInfo.avatar": 1
            }
        }
    ])

    if (!videos) {
        throw new ApiError(500, "Something went wrong while getting list of videos")
    }
    return res
        .status(200)
        .json(
            new ApiResponse(200,
                { videos },
                "Videos fetched Successfully"
            )
        )

})

const playTheVideo = asyncHandler(async (req, res) => {
    const videoId = req.params.videoId;

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            }
        }, {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerinfo",
            }
        },
        {
            $unwind: {
                path: "$ownerinfo",
                preserveNullAndEmptyArrays: true
            }
        }, {
            $project: {
                title: 1,
                description: 1,
                videoFile: 1,
                views: 1,
                createdAt: 1,
                owner: {
                    fullName: "$ownerinfo.fullName",
                    username: "$ownerinfo.username",
                    avatar: "$ownerinfo.avatar",
                    createdAt: "$ownerinfo.createdAt"
                }
            }
        }

    ]);

    if (!video || video.length === 0) {
        throw new ApiError(400, "Something happend while fetching video")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200,
                video[0],
                "Video fetched successfully"
            )
        )
})

const increaseViewandUpdateWatchHistory = asyncHandler(async (req, res) => {
    const { videoId, userinfo } = req.body;
    const user = req.user;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }
    const alreadyViewed = await View.findOne({
        viewedby: req.user._id,
        viewedfile: videoId
    });

    if (!alreadyViewed) {
        const result = await View.create({
            viewedby: req.user._id,
            viewedfile: videoId
        })

        if (!result) {
            throw new ApiError(400, "Error updating Views");
        }
    }


    const videoDetails = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(video._id)
            }
        }, {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedVideo",
                as: "likes"
            }
        }, {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "dislikedVideo",
                as: "dislikes"
            }
        }, {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "associatedVideo",
                as: "comments"
            }
        }, {
            $lookup: {
                from: "views",
                localField: "_id",
                foreignField: "viewedfile",
                as: "views"
            }
        }, {
            $addFields: {
                liked: {
                    $size: "$likes"
                },
                disliked: {
                    $size: "$dislikes"
                },
                commentCount: {
                    $size: "$comments"
                },
                viewCount: {
                    $size: "$views"
                },
                isliked: {
                    $cond: {
                        if: {
                            $in: [new mongoose.Types.ObjectId(req.user?._id),
                            {
                                $map: {
                                    input: "$likes",
                                    as: "like",
                                    in: "$$like.likedby"
                                }
                            }]
                        },
                        then: true,
                        else: false
                    }
                },
                isdisliked: {
                    $cond: {
                        if: {
                            $in: [
                                new mongoose.Types.ObjectId(req.user?._id),
                                {
                                    $map: {
                                        input: "$dislikes",
                                        as: "dislike",
                                        in: "$$dislike.dislikedby"
                                    }
                                }
                            ]
                        },
                        then: true,
                        else: false
                    }
                }

            }
        }, {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerinfo",
            },
        },
        {
            $unwind: {
                path: "$ownerinfo",
                preserveNullAndEmptyArrays: true,
            },
        }, {
            $project: {
                title: 1,
                liked: 1,
                disliked: 1,
                commentCount: 1,
                viewCount: 1,
                createdAt: 1,
                videoFile: 1,
                isliked: 1,
                isdisliked: 1,
                owner: {
                    fullName: "$ownerinfo.fullName",
                    username: "$ownerinfo.username",
                    avatar: "$ownerinfo.avatar",
                    createdAt: "$ownerinfo.createdAt"
                }
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, videoDetails, "View count updated successfully")
    );
});


const updateDislikes = asyncHandler(async (req, res) => {


    const { videoId } = req.body;
    const user = req.user;
    const video = await Video.findById(videoId);

    if (!videoId) {
        throw new ApiError(400, "No Type or Video id found")
    }

    const exists = await Dislike.exists({ dislikedby: user._id, dislikedVideo: video._id });

    if (!exists) {
        const result = await Dislike.create({
            dislikedby: user._id,
            dislikedVideo: video._id
        });

        const likeExists = await Like.exists({ likedby: user._id, likedVideo: video._id });
        if (likeExists) {
            const result = await Like.findOneAndDelete({
                likedby: user._id,
                likedVideo: video._id
            })
            if (!result) {
                throw new ApiError(400, "Error deleting Like")
            }


        }

    } else {
        const result = await Dislike.findOneAndDelete({
            dislikedby: user._id,
            dislikedVideo: video._id
        })



        if (!result) {
            throw new ApiError(400, "Error deleting dislike")
        }

    }
    const result = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(video._id)
            }
        }, {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedVideo",
                as: "likedcount"

            }
        }, {
            $lookup: {

                from: "dislikes",
                localField: "_id",
                foreignField: "dislikedVideo",
                as: "unlikedcount"

            }
        }, {
            $addFields: {
                liked: {
                    $size: "$likedcount"
                },
                disliked: {
                    $size: "$unlikedcount"
                }

            }
        }, {
            $project: {
                liked: 1,
                disliked: 1
            }
        }
    ])

    if (!result) {
        throw new ApiError(400, "Error getting Records")
    }
    return res.status(200).json(
        new ApiResponse(200, result, "Updated dislike Count successfully")
    );

});

const updateLikes = asyncHandler(async (req, res) => {
    const { videoId } = req.body;
    const user = req.user;
    const video = await Video.findById(videoId);
    const exists = await Like.exists({ likedby: user._id, likedVideo: video._id });
    if (!exists) {
        const result = await Like.create({
            likedby: user._id,
            likedVideo: video._id
        })

        const dislikeExists = await Dislike.exists({ dislikedby: user._id, dislikedVideo: video._id });

        if (dislikeExists) {
            const result = await Dislike.findOneAndDelete({
                dislikedby: user._id,
                dislikedVideo: video._id
            })


            if (!result) {
                throw new ApiError(400, "Error deleting dislike")
            }

        }
    } else {
        const result = await Like.findOneAndDelete({
            likedby: user._id,
            likedVideo: videoId
        })

        if (!result) {
            throw new ApiError(400, "Error deleting Like")
        }

    }

    const result = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(video._id)
            }
        }, {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "likedVideo",
                as: "likedcount"

            }
        }, {
            $lookup: {

                from: "dislikes",
                localField: "_id",
                foreignField: "dislikedVideo",
                as: "unlikedcount"

            }
        }, {
            $addFields: {
                liked: {
                    $size: "$likedcount"
                },
                disliked: {
                    $size: "$unlikedcount"
                }

            }
        }, {
            $project: {
                liked: 1,
                disliked: 1
            }
        }
    ])
    if (!result) {
        throw new ApiError(400, "Error getting Records")
    }
    return res.status(200).json(
        new ApiResponse(200, result, "Updated Like Count successfully")
    );

});


const getRelatedVideos = asyncHandler(async (req, res) => {
    const { videoId } = req.body;

    if (!videoId) {
        throw new ApiError(400, "videoId is required to get related videos");
    }

    const currentVideo = await Video.findById(videoId);

    if (!currentVideo) {
        throw new ApiError(404, "Video not found");
    }

    const currentVideoTags = currentVideo.tags || [];


    const videos = await Video.aggregate([
        {
            $match: {
                isPublished: true,
                owner: { $ne: req.user._id },
                _id: { $ne: new mongoose.Types.ObjectId(videoId) }
            }
        }, {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerInfo"
            }
        }, {
            $lookup: {
                from: "views",
                localField: "_id",
                foreignField: "viewedfile",
                as: "views"
            }
        },
        { $unwind: "$ownerInfo" },
        {
            $addFields: {
                matchedTagsCount: {
                    $size: {
                        $setIntersection: [
                            { $ifNull: ["$tags", []] },
                            currentVideoTags
                        ]
                    }
                },
                viewCount: {
                    $size: "$views"
                }
            }
        },
        { $sort: { matchedTagsCount: -1, createdAt: -1 } },
        { $limit: 10 }, // 👈 limit to top 10 related videos

        {
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                viewCount: 1,
                createdAt: 1,
                duration: 1,
                tags: 1,
                matchedTagsCount: 1,
                "ownerInfo._id": 1,
                "ownerInfo.username": 1,
                "ownerInfo.fullName": 1,
                "ownerInfo.avatar": 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, { videos }, "Related videos fetched successfully")
    );
});

const getWatchedVideos = asyncHandler(async (req, res) => {
    // const { videoId } = req.body;
    const user = req.user;


    // if (!videoId) {
    //     throw new ApiError(400, "videoId is required to get related videos");
    // }



    const videos = await View.aggregate([
        {
            $match: {
                viewedby: new mongoose.Types.ObjectId(user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "viewedfile",
                foreignField: "_id",
                as: "video"
            }
        },
        { $unwind: "$video" },
        {
            $replaceRoot: {
                newRoot: "$video"
            }
        },
        {
            $match: {
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerInfo"
            }
        },
        { $unwind: "$ownerInfo" },
        {
            $lookup: {
                from: "views",
                localField: "_id",
                foreignField: "viewedfile",
                as: "views"
            }
        },
        {
            $addFields: {
                viewCount: { $size: "$views" }
            }
        },
        {
            $sort: {
                matchedTagsCount: -1,
                createdAt: -1
            }
        },
        {
            $limit: 10
        },
        {
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                viewCount: 1,
                createdAt: 1,
                duration: 1,
                "ownerInfo._id": 1,
                "ownerInfo.username": 1,
                "ownerInfo.fullName": 1,
                "ownerInfo.avatar": 1
            }
        }
    ]);
    return res.status(200).json(
        new ApiResponse(200, { videos }, "watched videos fetched successfully")
    );
});
const getLikedVideos = asyncHandler(async (req, res) => {
    // const { videoId } = req.body;
    const user = req.user;

    if (!user) {
        throw new ApiError(400, "user is required to get liked videos");
    }



    const videos = await Like.aggregate([
        {
            $match: {
                likedby: new mongoose.Types.ObjectId(user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "likedVideo",
                foreignField: "_id",
                as: "video"
            }
        },
        { $unwind: "$video" },
        {
            $replaceRoot: {
                newRoot: "$video"
            }
        },
        {
            $match: {
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerInfo"
            }
        },
        { $unwind: "$ownerInfo" },
        {
            $lookup: {
                from: "views",
                localField: "_id",
                foreignField: "viewedfile",
                as: "views"
            }
        },
        {
            $addFields: {
                viewCount: { $size: "$views" }
            }
        },
        {
            $sort: {
                matchedTagsCount: -1,
                createdAt: -1
            }
        },
        {
            $limit: 10
        },
        {
            $project: {
                _id: 1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                viewCount: 1,
                createdAt: 1,
                duration: 1,
                "ownerInfo._id": 1,
                "ownerInfo.username": 1,
                "ownerInfo.fullName": 1,
                "ownerInfo.avatar": 1
            }
        }
    ]);


    return res.status(200).json(
        new ApiResponse(200, { videos }, "Related videos fetched successfully")
    );
});
const removeVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.body;
    const user = req.user;
    const video = await Video.findById(videoId)
    const resultThumb = await removeOnCloudinary(video.public_Thumb);
    const resultVideo = await removeOnCloudinary(video.public_Video);

    if (!resultVideo || !resultThumb) throw new ApiError(400, "Error removing video from cloudinary")

    const result = await Video.findByIdAndDelete(videoId);

    if (!result) throw new ApiError(400, "Error removing video ")


    const videos = await Video.find({ owner: user._id });

    return res.status(200)
        .json(
            new ApiResponse(200, { videos }, "Related videos fetched successfully")
        );
});






export {
    addNewVideo,
    getAllMyVideos,
    getAllVideos,
    playTheVideo,
    increaseViewandUpdateWatchHistory,
    updateDislikes,
    updateLikes,
    getRelatedVideos,
    getWatchedVideos,
    getLikedVideos,
    removeVideo
};