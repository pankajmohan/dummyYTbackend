import dotenv from "dotenv";
import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import getVideoDuration from "../utils/getVideoDuration.js"
// import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
dotenv.config({
    // path:'./.env'
})

const addNewVideo = asyncHandler(async (req, res) => {

    const { title, description, isPublished } = req.body

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
    console.log(req.body)
    const newVideo = await Video.create({
        videoFile: video?.url,
        thumbnail: thumbnail?.url,
        title,
        description,
        duration,
        view: 0,
        isPublished,
        owner: req.user._id
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
    const videos = await Video.aggregate([
        {
            $match: {
                isPublished: true

            }
        }, {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerInfo"

            }
        }, {
            $unwind: "$ownerInfo"
        }, {
            $project: {
                _id:1,
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                view: 1,
                createdAt: 1,
                duration:1,
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
export {
    addNewVideo,
    getAllMyVideos,
    getAllVideos
};