import mongoose,{Schema} from "mongoose";
const viewSchema = new Schema({
    viewedby:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    viewedfile:{
        type:Schema.Types.ObjectId,
        ref:"Video"
    }
},{
    timestamps:true
})

viewSchema.index({ viewedby:1, viewedfile:1})
export const View = mongoose.model("View", viewSchema)