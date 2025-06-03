import mongoose,{Schema} from "mongoose";
const commentSchema = new Schema({
    commentedby:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    associatedVideo:{
        type:Schema.Types.ObjectId,
        ref:"Video"
    },
    parentId:{
        type:Schema.Types.ObjectId,
        ref:"Comment",
        default:null
    },
    content:{
        type:String,
        required:[true, "There is no content in comment" ]
    }
},{
    timestamps:true
})

commentSchema.index({ commentedby:1, associatedvideo:1})
export const Comment = mongoose.model("Comment", commentSchema)