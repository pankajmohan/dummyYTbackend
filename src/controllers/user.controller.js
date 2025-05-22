import dotenv from "dotenv";
import { asyncHandler } from "../utils/asynHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken";
dotenv.config({
    // path:'./.env'
})
const generateAccessTokenAndRefreshTokens = async(userid) => {
    try {
         const user = await User.findById(userid);
        const accesstoken = await user.generateAccessToken();
        const refereshtoken = await user.generateRefreshToken();

        user.refereshtoken = refereshtoken;

        await user.save({ validateBeforeSave: false });

        return {accesstoken, refereshtoken}
    } catch(error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}
const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    //check for images , check for avatar
    //upload them to cloudinary, avatar
    //create user object - create entry in db
    // remove password and refresh token field from response
    //check for user creation
    // return res

    const { fullName, email, username, password } = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User already registed");
    }
    // console.log("req.files:", req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required local")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required clouadinary")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )



});


const loginUser = asyncHandler(async (req, res) => {
    //get details from user
    //check if details are filled by user
    //check if username exists
    //check if password entered by user is same or not 
    // if user has entered the correct password we must return the status 200 with message user logged in . and data with access and refresh tokens
    // console.log(req.body);
    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(400, "Username or email does not exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

   const {accesstoken, refreshtoken} = await generateAccessTokenAndRefreshTokens(user._id);

    const loggedInuser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
            }

    return res
    .status(200)
    .cookie("accessToken", accesstoken, options)
    .cookie("refreshToken", refreshtoken, options)
    .json(
        new ApiResponse(200, {
            user:loggedInuser, accesstoken, refreshtoken
        },"User logged in successfully")
    )
})

const logoutUser =  asyncHandler( async (req, res) =>{
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshtoken:undefined
            }
        },
        {
            new:true
        }
    );
    const options = {
        httpOnly: true,
        secure: true,
            }


      return res
      .status(200)
      .clearCookie("accessToken",options)      
      .clearCookie("refreshToken",options)
      .json(
        new ApiResponse(200, {}, "User logged out successfully")
      )      
})

const refreshAccessToken = async (req,res) =>{
    const incomingRefreshToken = req.cookies.refereshtoken || req.body.refreshtoken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user){
            throw new ApiError(401, "Invalid refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
        const options = {
            httpOnly:true,
            secure:true
        }
        const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(200, {
                accessToken,
                "refreshToken":newRefreshToken,
            },
            "Access token refreshed")
        ) 
        
    } catch (error) {

        throw new ApiError(401,error?.message || "Invalid refresh Token");
        
    }

}
export { registerUser, loginUser, logoutUser, refreshAccessToken };