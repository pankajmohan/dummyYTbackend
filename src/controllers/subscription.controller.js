import dotenv from "dotenv";
import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js";
import mongoose, { Mongoose } from "mongoose";

dotenv.config({
    // path:'./.env'
})

const subscribeTheChannel = asyncHandler(async (req, res) => {
    //get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    //check for images , check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in db
    // remove password and refresh token field from response
    //check for user creation
    // return res

    const channelId = req.params.channelId;

    const userId = req.user._id;

    if (channelId === userId) {

        throw new ApiError(400, "Cant Subscribe to your own channel")
    }






    const existingSubscruption = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    })
    if (existingSubscruption) {
        throw new ApiError(400, "Already subscribed")
    }
    const subscription = await Subscription.create({
        subscriber: userId,
        channel: channelId
    })

    return res
        .status(201)
        .json(
            new ApiResponse(200,
                subscription,
                "User is Subscribed successfully"
            )
        )
});
const unSubscribeTheChannel = asyncHandler(async (req, res) => {

    const channelId = req.params.channelId;

    const userId = req.user._id;

    const result = await Subscription.findOneAndDelete({
        subscriber: userId,
        channel: channelId
    })
    if (!result) {
        throw new ApiError(404, "Subscription not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Unsubscribed successfully")
    );

})

const getAllSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.body;
    // console.log("channelId",channelId);
    //  channelId;
    const result = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            },
        }, {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "user"
            },
        }, {
            $unwind: {
                path: "$user",
                                preserveNullAndEmptyArrays: true
            }

        },{
            $project:{
                channelId:1,
                subscriber:1,
                "user":{                    
                    fullName: "$user.fullName",
                    username: "$user.username",
                    avatar: "$user.avatar",
                    createdAt: "$user.createdAt"
                }
            }
        }
    ])

    if (!result) {
        throw new ApiError(400, "Error getting Subscription of user")
    }


    res.status(200)
        .json(
            new ApiResponse(200, result, "Subscription fetched successfully")
        )
})
export {
    subscribeTheChannel,
    unSubscribeTheChannel,
    getAllSubscribers
};