import dotenv from "dotenv";
import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import getVideoDuration from "../utils/getVideoDuration.js"
import { Comment } from "../models/comment.model.js"
import { Video } from "../models/video.model.js"
import { DislikeComment } from "../models/dislikeComment.model.js"
import { LikeComment } from "../models/likeComments.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import mongoose, { Mongoose } from "mongoose";
dotenv.config({
    // path:'./.env'
})
const getComments = asyncHandler(async (req, res) => {
    const { videoId, page = 0 } = req.body;
    if (!videoId) {
        throw new ApiError(400, "Video id is required")
    }
    

const comments = await Comment.aggregate([
  {
    $match: {
      associatedVideo: new mongoose.Types.ObjectId(videoId),
      parentId: null
    }
  },
  {
    $sort: { createdAt: -1 }
  },
  {
    $skip: page * 10
  },
  {
    $limit: 10
  },
  // Lookup user details
  {
    $lookup: {
      from: "users",
      localField: "commentedby",
      foreignField: "_id",
      as: "commentedby"
    }
  },
  {
    $unwind: {
      path: "$commentedby",
      preserveNullAndEmptyArrays: true
    }
  },
  // Lookup likes
  {
    $lookup: {
      from: "likecomments",
      localField: "_id",
      foreignField: "likedComment",
      as: "likes"
    }
  },
  // Lookup dislikes
  {
    $lookup: {
      from: "dislikecomments",
      localField: "_id",
      foreignField: "dislikedComment",
      as: "dislikes"
    }
  },
  {
    $addFields: {
      likeCount: { $size: "$likes" },
      dislikeCount: { $size: "$dislikes" },
      isLiked: {
        $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedby"]
      },
      isDisliked: {
        $in: [new mongoose.Types.ObjectId(req.user._id), "$dislikes.dislikedby"]
      }
    }
  },
  {
    $project: {
      content: 1,
      createdAt: 1,
      updatedAt: 1,
      likeCount: 1,
      dislikeCount: 1,
      isLiked: 1,
      isDisliked: 1,
      commentedby: {
        _id: "$commentedby._id",
        fullName: "$commentedby.fullName",
        avatar: "$commentedby.avatar",
        username: "$commentedby.username"
      }
    }
  }
]);
    if (!comments) {
        throw new ApiError(400, "Cant get comments")
    }

    return res.status(200).json(
        new ApiResponse(200, comments, "Comments fetched Successfully")
    )
})

const addnewComment = asyncHandler(async (req, res) => {
    const { videoId, content, page = 0 } = req.body;
    const user = req.user;
    const result = await Comment.create({
        associatedVideo: videoId,
        commentedby: user._id,
        content: content
    })

    if (!result) {
        throw new ApiError(401, "Error adding new comment");
    }


    const comments = await Comment.aggregate([
  {
    $match: {
      associatedVideo: new mongoose.Types.ObjectId(videoId),
      parentId: null
    }
  },
  {
    $sort: { createdAt: -1 }
  },
  {
    $skip: page * 10
  },
  {
    $limit: 10
  },
  // Lookup user details
  {
    $lookup: {
      from: "users",
      localField: "commentedby",
      foreignField: "_id",
      as: "commentedby"
    }
  },
  {
    $unwind: {
      path: "$commentedby",
      preserveNullAndEmptyArrays: true
    }
  },
  // Lookup likes
  {
    $lookup: {
      from: "likecomments",
      localField: "_id",
      foreignField: "likedComment",
      as: "likes"
    }
  },
  // Lookup dislikes
  {
    $lookup: {
      from: "dislikecomments",
      localField: "_id",
      foreignField: "dislikedComment",
      as: "dislikes"
    }
  },
  {
    $addFields: {
      likeCount: { $size: "$likes" },
      dislikeCount: { $size: "$dislikes" },
      isLiked: {
        $in: [new mongoose.Types.ObjectId(req.user._id), "$likes.likedby"]
      },
      isDisliked: {
        $in: [new mongoose.Types.ObjectId(req.user._id), "$dislikes.dislikedby"]
      }
    }
  },
  {
    $project: {
      content: 1,
      createdAt: 1,
      updatedAt: 1,
      likeCount: 1,
      dislikeCount: 1,
      isLiked: 1,
      isDisliked: 1,
      commentedby: {
        _id: "$commentedby._id",
        fullName: "$commentedby.fullName",
        avatar: "$commentedby.avatar",
        username: "$commentedby.username"
      }
    }
  }
]);

    
    return res.status(200)
        .json(
            new ApiResponse(200, comments, "Comment added Successfully")
        )
})


const updateDislikedComments = asyncHandler(async (req, res) => {
    const { commentId } = req.body;
    const user = req.user;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const exists = await DislikeComment.exists({
        dislikedby: user._id,
        dislikedComment: comment._id
    });

    if (!exists) {
        await DislikeComment.create({
            dislikedby: user._id,
            dislikedComment: comment._id
        });

        // Remove like if it exists
        await LikeComment.findOneAndDelete({
            likedby: user._id,
            likedComment: comment._id
        });

    } else {
        // Toggle off the dislike
        await DislikeComment.findOneAndDelete({
            dislikedby: user._id,
            dislikedComment: comment._id
        });
    }

    const result = await Comment.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(comment._id)
            }
        },
        {
            $lookup: {
                from: "likecomments",
                localField: "_id",
                foreignField: "likedComment",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "dislikecomments",
                localField: "_id",
                foreignField: "dislikedComment",
                as: "dislikes"
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" },
                dislikeCount: { $size: "$dislikes" },
                isLiked: {
                    $in: [
                        new mongoose.Types.ObjectId(user._id),
                        {
                            $map: {
                                input: "$likes",
                                as: "like",
                                in: "$$like.likedby"
                            }
                        }
                    ]
                },
                isDisliked: {
                    $in: [
                        new mongoose.Types.ObjectId(user._id),
                        {
                            $map: {
                                input: "$dislikes",
                                as: "dislike",
                                in: "$$dislike.dislikedby"
                            }
                        }
                    ]
                }
            }
        },
        {
            $project: {
                content: 1,
                commentedby: 1,
                createdAt: 1,
                likeCount: 1,
                dislikeCount: 1,
                isLiked: 1,
                isDisliked: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, result[0], "Comment dislikes updated")
    );
});


const updatelikedComments = asyncHandler(async (req, res) => {
    const { commentId } = req.body;
    const user = req.user;

    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const exists = await LikeComment.exists({ likedby: user._id, likedComment: comment._id });

    if (!exists) {
        await LikeComment.create({
            likedby: user._id,
            likedComment: comment._id,
        });

        // Remove from dislikes if exists
        await DislikeComment.findOneAndDelete({
            dislikedby: user._id,
            dislikedComment: comment._id,
        });

    } else {
        // Toggle off the like
        await LikeComment.findOneAndDelete({
            likedby: user._id,
            likedComment: comment._id,
        });
    }

    // Aggregation to get updated like/dislike status
    const result = await Comment.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(comment._id)
            }
        },
        {
            $lookup: {
                from: "likecomments",
                localField: "_id",
                foreignField: "likedComment",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "dislikecomments",
                localField: "_id",
                foreignField: "dislikedComment",
                as: "dislikes"
            }
        },
        {
            $addFields: {
                likeCount: { $size: "$likes" },
                dislikeCount: { $size: "$dislikes" },
                isLiked: {
                    $in: [
                        new mongoose.Types.ObjectId(user._id),
                        {
                            $map: {
                                input: "$likes",
                                as: "like",
                                in: "$$like.likedby"
                            }
                        }
                    ]
                },
                isDisliked: {
                    $in: [
                        new mongoose.Types.ObjectId(user._id),
                        {
                            $map: {
                                input: "$dislikes",
                                as: "dislike",
                                in: "$$dislike.dislikedby"
                            }
                        }
                    ]
                }
            }
        },
        {
            $project: {
                content: 1,
                commentedby: 1,
                createdAt: 1,
                likeCount: 1,
                dislikeCount: 1,
                isLiked: 1,
                isDisliked: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, result[0], "Comment likes updated")
    );
});

export {
    getComments,
    addnewComment,
    updateDislikedComments,
    updatelikedComments
}