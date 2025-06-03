import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema({
    videoFile: {
        type: String,
        required: true,
    },
    thumbnail: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },

    isPublished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    tags: {
        type: [String],
        default: []
    },
    public_Video: {
        type: String,
        default: null
    },
    public_Thumb: {
        type: String,
        default: null
    },


}, {
    timestamps: true
});

videoSchema.plugin(mongooseAggregatePaginate);
export const Video = mongoose.model("Video", videoSchema)