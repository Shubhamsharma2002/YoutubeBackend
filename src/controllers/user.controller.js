import asyncHandler from "../utils/AsyncHandler.js"

import ApiError from "../utils/ApiError.js" 
import{User} from "../models/user.model.js"
import{uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose"
import { use } from "bcrypt/promises.js"

const genratteAcessAndRefereshToken = async(userId) =>{
    try {
        
       const user = await User.findById(userId);
       const accessToken = user.genrateAcessToken()
       const refershToken = user.genrateRefershToken()
       user.refershToken = refershToken 
       user.save({validateBeforeSave:false})

       return {accessToken, refershToken}
    } catch (error) {
        throw new ApiError(500, "something went wrong while genrating acess and referesh token");
    }
}

// Registration 
const registerUser = asyncHandler(async(req,res) =>{
   
    //  get user details from frontend
        const {username,email,fullname,password} = req.body;
       
        console.log(req.body);
        
        
    //  validation  - not empty
        
      if([username,email,fullname,password].some((field) => field?.trim() === "")){
           throw new ApiError(400, "All fields are required")
      }
    // check if user is alredy  exists : username, email
    const existedUser =  await User.findOne({
        $or:[{username}, {email}]
    })

    if(existedUser){
        throw new ApiError (409, "User with email or username is alredy exisits");
    }
    // //  check for image , check for avtar
      const avtarLocal = req.files?.avtar[0]?.path;
    //   const coverLocal = req.files?.coverimg[0]?.path;
// checking for coverImg
    let coverLocal;
    if (req.files && Array.isArray(req.files.coverimg) && req.files.coverimg.length > 0) {
        coverLocal = req.files.coverimg[0].path
    }
    // check  to avtar
    if(!avtarLocal){
        throw new ApiError(400,"Avtar is required");
    }


    // // upload to cloudniary
     const avtar = await uploadOnCloudinary(avtarLocal);
     const coverimg = await uploadOnCloudinary(coverLocal);

     if(!avtar){
        throw new ApiError(400,"Avtar is required");
     }
   
    // create the user object - create in db
       const userData = await User.create({
            username : username.toLowerCase(),
            email,
            avtar:  avtar.url,
            coverimg: coverimg?.url || "",
            fullname,
            password
        })

        // check for user creation remove pasword and refferesh token
        const createdUser = await User.findById(userData._id).select(
            "-password -refershToken"
        );
    
    // checking of user
    if(!createdUser){
        throw new ApiError(500,"something went wrong while creating user")
    }

    // return response
     return res.status(201).json(
        new ApiResponse(200, createdUser,"User Register suceesfully")
     )
})

// Login 
const loginUser = asyncHandler(async(req,res)=>{
    // login based on username || email
    // password
    // acess and refresh token 
    // send cookies

    const {username, email, password} = req.body;

    // if(!(username || email)){
    //     throw new ApiError(400, 'username or email is required');
    // }
    if(!username|| !email){
        if(!username&& !email){
            throw new ApiError(400, 'username or email is required');
        }
    }
    const user = await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not found with given data")
    }
   
    const isValidPassword = await user.isPasswordCorrect(password);
    if(!isValidPassword){
        throw new ApiError(401, "Invalid user credentials")
    }
    const {accessToken,refershToken} = await genratteAcessAndRefereshToken(user._id);

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken");
// seting cookies
    const option = {
        httpOnly:true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken", accessToken,option)
    .cookie("refereshToken", refershToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refershToken
            },
            "user loged in Sucessfully"
        )
    )
})
// Logout
const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refershToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

// refersh token
const refereshAcessToken = asyncHandler(async(req,res)=>{
    const incomigRefeshToken = req.cookies.refershToken || req.body.refershToken

    if(!incomigRefeshToken){
        throw new ApiError(401,"Unatuthirized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomigRefeshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await  User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refersh Token")
        }
    
        if(incomigRefeshToken !== user?.refershToken){
            throw new ApiError(401,"refesh Token is invalid or used")
        }
        const options = {
            httpOnly:true,
            secure:true
        }
    
       const {accessToken,newrefershToken} = await genratteAcessAndRefereshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refershToken",newrefershToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refershToken:newrefershToken},
                "Access token refereshd"
            )
        )
    } catch (error) {
          throw new ApiError(401,"Invalid refershToken")
    }
})

// change password
const ChnageCurrentPassword = asyncHandler(async(req,res)=>{
     const {oldPassword , newPassword} = req.body;
     const user = await User.findById(req.user?._id);
     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
     if(!isPasswordCorrect){
        throw new ApiError(400 ,"Password is incorrect");
     }

     user.password = newPassword;
     await user.save({validateBeforeSave:false})
     return res
     .status(200)
     .json(new ApiResponse(200,{} , "Password updated Sucessfully"));
})
// login user details
const getCurrentUser = asyncHandler(async(req, res)=>{
    return res 
    .status(200)
    .json(

        new ApiResponse(200,req.user , "Current User Fetch Suceefully")
    )
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
   const {fullname,email} = req.body;
   if(!fullname || !email){
    throw new ApiError(400, "All field are required");
   }

   const user = User.findByIdAndUpdate(
    req.user?._id,{
        $set:{
            fullname:fullname,
            email:email
        }
    },{
        new:true
    }
   ).select("-password ")

   return res 
   .status(200)
   .json(
    new ApiResponse(200, user , "Account Details Updated SucessFully")
   )
})

// update profile
const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocal = req.file?.path;
    if(!avatarLocal){
        throw new ApiError(400, "Avatar file is missing")

    }
    const avtar = await uploadOnCloudinary(avatarLocal);

    if(!avtar.url){
        throw new ApiError(400,"Error while uploading the avatar")
    }

   const data =  await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                avtar:avtar.url
            }
        },{new:true}
    ).select("-password")

    return res 
   .status(200)
   .json(
    new ApiResponse(200, data , "Avatar Updated SucessFully")
   )
})

// update coverImg
const updateUserCoverImg = asyncHandler(async(req,res)=>{
    const coverimgLocal = req.file?.path;
    if(!coverimgLocal){
        throw new ApiError(400, "Avatar file is missing")

    }
    const coverimg = await uploadOnCloudinary(coverimgLocal);

    if(!coverimg.url){
        throw new ApiError(400,"Error while uploading the avatar")
    }
// delete cluod also
   const data =  await User.findByIdAndUpdate(
        req.user?.id,
        {
            $set:{
                coverimg:coverimg.url
            }
        },{new:true}
    ).select("-password")
    return res 
   .status(200)
   .json(
    new ApiResponse(200, data , "Cover Img Updated SucessFully")
   )
})


// User Channel Profile

const getUserChannelProfile = asyncHandler(async(req,res)=>{

    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing");
    }
    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },{
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        }
        ,{
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },{
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                channelSubscribeToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in : [req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                   
                }
            }
        },{
            $project:{
                fullName:1,
                username:1,
                subscriberCount:1,
                channelSubscribeToCount:1,
                isSubscribed:1,
                avtar:1,
                coverImg:1,
                email:1,

            }
        }
    ])

    if(!channel){
         throw new ApiError(404, "channel not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, channel[0],"user channel fetch successfully")
    )
})
 
// watchHistory 
const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },{
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[

                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avtar:1
                                    }
                                }
                            ]
                        }
                    }
                    ,{
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
       return res.status(200)
       .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watch histroy fetch "
        )
       )
})


export {
    registerUser, 
    loginUser, 
    logoutUser,
    refereshAcessToken,
    ChnageCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImg,
    getUserChannelProfile,
    getWatchHistory
}