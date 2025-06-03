import mongoose,{Schema} from "mongoose";
const dislikeSchema = new Schema({
    dislikedby:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    dislikedVideo:{
        type:Schema.Types.ObjectId,
        ref:"Video"
    }
},{
    timestamps:true
})

dislikeSchema.index({ dislikedby:1, dislikedVideo:1}, {unique: true})
export const Dislike = mongoose.model("Dislike", dislikeSchema)