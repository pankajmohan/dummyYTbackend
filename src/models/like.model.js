import mongoose,{Schema} from "mongoose";
const likeSchema = new Schema({
    likedby:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    likedVideo:{
        type:Schema.Types.ObjectId,
        ref:"Video"
    }
},{
    timestamps:true
})

likeSchema.index({ likedby:1, likedVideo:1}, {unique: true})
export const Like = mongoose.model("Like", likeSchema)