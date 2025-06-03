import dotenv from "dotenv";
import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

dotenv.config({
    // path:'./.env'
})
// console.log("Cloudinary config:", {
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY ? "✅ Loaded" : "❌ Missing",
//   api_secret: process.env.CLOUDINARY_API_SECRET ? "✅ Loaded" : "❌ Missing"
// });

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key:  process.env.CLOUDINARY_API_KEY, 
        api_secret:  process.env.CLOUDINARY_API_SECRET
    });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) {console.log("No local file path provided") 
            return null}
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto",
            transformation: [
        {
          quality: "auto:good",     
          fetch_format: "auto",     
          video_codec: "auto",      
          width: 1280,              
          crop: "limit"
        }
      ]
        })
        //file has been uploaded successfully
        console.log("file is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath)// remove the locally saved temporary file as the upload operation got failed
        return response
    } catch (error) {
        console.error("Cloudinary upload error:", error);
        fs.unlinkSync(localFilePath)// remove the locally saved temporary file as the upload operation got failed
    }
}

const removeOnCloudinary = async ( public_id ) => {
  if (!public_id) {
    throw new Error('Missing public_id');
  }

  try {
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: "auto", // Use "image", "video", or "raw" if needed
    });

    if (result.result === 'ok') {
      return { success: true, result };
    } else {
      return { success: false, error: 'Failed to delete media', result };
    }
  } catch (error) {
    return { success: false, error: 'Cloudinary error', details: error.message };
  }
};



export {uploadOnCloudinary ,removeOnCloudinary}
