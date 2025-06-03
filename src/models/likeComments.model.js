import mongoose,{Schema} from "mongoose";
const likeCommentSchema = new Schema({
    likedby:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    likedComment:{
        type:Schema.Types.ObjectId,
        ref:"Comment"
    }
},{
    timestamps:true
})

likeCommentSchema.index({ likedby:1,likedComment: 1 }, {unique: true})
export const LikeComment = mongoose.model("LikeComment", likeCommentSchema)