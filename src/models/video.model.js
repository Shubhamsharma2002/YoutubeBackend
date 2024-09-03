import mongoose, {Schema} from "mongoose";
import mongooseaggregatepaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema(
    {
        videofile:{
            type:String, //could
            required : true
        },
        thumbnel:{
            type:String, //could
            required : true
        },
        title:{
            type:String, 
            required : true
        },
        description:{
            type:String, 
            required : true
        },
        duration:{
            type:Number,
            required:true
        },
        views:{
            type:Number,
            default:0
        },
        ispublished:{
            type: Boolean,
            default :true
        },
        owener:{
            type:Schema.Types.ObjectId,
            ref:"User"
        }
    },{
        timestamps:true
    }
)

videoSchema.plugin(mongooseaggregatepaginate);

export const Video = mongoose.model("Video", videoSchema);