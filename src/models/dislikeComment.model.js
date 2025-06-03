import mongoose,{Schema} from "mongoose";
const dislikeCommentSchema = new Schema({
    dislikedby:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    dislikedComment:{
        type:Schema.Types.ObjectId,
        ref:"Comment"
    }
},{
    timestamps:true
})

dislikeCommentSchema.index({ dislikedby:1, dislikedComment: 1 }, {unique: true})
export const DislikeComment = mongoose.model("DislikeComment", dislikeCommentSchema)