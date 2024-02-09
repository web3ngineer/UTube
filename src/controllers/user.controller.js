import {asyncHandler} from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { deleteOnCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js';
import { apiResponse } from '../utils/apiResponse.js';
import { mongoose } from 'mongoose';
import jwt  from 'jsonwebtoken';


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false });
        return {accessToken, refreshToken}

    } catch (error) {
        throw new apiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async(req, res) => {
    // res.status(200).json({
    //     message: "OK",
    // })
    //  get user details from frontend
    //  validation not empty
    //  check user existance 
    //  check for images and avtar
    //  upload them to cloudinary , avatar check 
    //  create user object - create entry in db 
    //  remove password and refresh token field from response
    //  return response 

    const { fullName, email, username, password } = req.body
    // console.log("email: ", email);

    // if (fullName === "") {
    //     throw new apiError(400, "Full Name is required")
    // }

    if (
        [fullName, email, username, password].some((field) => field?.trim() ==="")
    ){
        throw new apiError(400, "All fields are required")
    }

    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    })

    if (existingUser) {
        throw new apiError(409, "User already exist")
    }
    // req.body ...... multer middle gives req.file 
    // console.log(req.files);
    
    const avatarLocalPath =req.files?.avatar[0]?.path;
    // console.log(avatarLocalPath);

    let coverImageLocalPath
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    // console.log(coverImageLocalPath);

    if (!avatarLocalPath) {
        throw new apiError(400, "Avatar file path is required")
    }
    // const avatarPath = '../../' + avatarLocalPath 
    // const coverPath = '../../' + coverImageLocalPath 

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // console.log(avatar);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // console.log(coverImage);

    if (!avatar) {
        throw new apiError(400, "Avatar file is required")
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
   )

   if(!createdUser){
        throw new apiError(500, "Something went wrong while registering user")
   }

   return res.status(201).json(
    new apiResponse(200, createdUser, "User Registered Successfully")
   )
    
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> date
    //  username or email
    // find the user 
    // password check
    // access and refresh token
    // send cookie

    const {email, username, password} = req.body

    if(!(username || email)){
        throw new apiError(400, "username or email is required")
    }

   const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new apiError(404, "user doesn't exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new apiError(401, 'Invalid Password')
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure:true,
    }
    console.log("user logged in successfully");

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options).json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged in successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            // $set: {
            //     refreshToken: undefined
            // }
            $unset: {
                refreshToken: 1 // this will remove the field from the user
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure:true
    }
    console.log("user logged out successfully");

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new apiError(401, "unauthorized request")
    }

   try {
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
 
     const user = await User.findById(decodedToken._id)
     if(!user){
         throw new apiError(401, "invalid refresh token")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new apiError(401, "Refresh Token is expired or used")
     }
 
     const options = {
         httpOnly: true,
         secure: true
     }
 
     const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)
     const newRefreshToken = refreshToken;
    //  console.log(accessToken)
    //  console.log(newRefreshToken)
 
     return res.status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newRefreshToken, options)
     .json(
         new apiResponse(200,
             {
                 accessToken,
                 refreshToken: newRefreshToken
             },
             "New Access Token Generated"
         )
     )
   } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
   }
    
})

const chnageCurrentPassword = asyncHandler(async(req, res) => {

    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new apiError(400, "Invalid Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new apiResponse(200, {}, "Password changed successfully" ))
})

const getCurrentUser = asyncHandler(async(req, res) => {

    return res.status(200).
    json(new apiResponse(200, req.user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req, res) => {

    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new apiError(400, "Please provide full name and email address to continue")
    }

    const user = await  User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}

    ).select("-password")

    return res.status(200)
    .json(new apiResponse(200, user, "account details updated"))
})

const updateUserAvatar = asyncHandler(async(req, res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new apiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new: true}
    ).select("-password")

    //remove old image from cloudinary and local system
    const deleteOldAvatar = await deleteOnCloudinary(req.user?.avatar)
    if(!deleteOldAvatar){
        throw new apiError(400, "Error while deleting old avatar file")
    }

    return res.status(200)
    .json(new apiResponse(200, user, "Avtar image updated succesfully"))
})

const updateUserCoverImage = asyncHandler(async(req, res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new apiError(400, "cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new apiError(400, "Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    //  Add functionality to delete old images from cloudinary
    const deleteOldCoverImage = await deleteOnCloudinary(req.user?.coverImage)
    if(!deleteOldCoverImage){
        throw new apiError(400, "Error while deleting old coverImage file")
    }

    return res.status(200)
    .json(new apiResponse(200, user, "cover image updated succesfully"))
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new apiError(400,"Username field cannot be empty")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username:username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField : "_id",
                foreignField: "channel",
                as : "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField : "_id",
                foreignField: "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size:"$subscribers"
                },
                channleSubscribedToCount: {
                    "$size":"$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channlesSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            }
        }
    ])

    if(!channel?.length){
        throw new apiError(400, "channel does not exists")
    }
    console.log(channel);

    return res.status(200)
    .json(new apiResponse(200, channel[0], "User channel fetched successfully"))


})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from : 'videos',
                localField:'watchHistory',
                foreignField:'_id',
                as:'watchHistory',
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName:1,
                                        username:1,
                                        avatar:1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).
    json(new apiResponse(200, user[0].watchHistory ,'Watch history fetched successfully'))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    chnageCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} 
 