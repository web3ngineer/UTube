import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Id")
    }

    const likedByUser = await  Like.findOne({
            likedBy: req.user?._id, 
            video: videoId
    })

    if(likedByUser){
        const videoUnLike = await  Like.findByIdAndDelete(likedByUser._id)

        return res.status(200).json(new apiResponse(200, videoUnLike, "Video Unliked Successfully"))
    }

    const videoLike = await  Like.create({
        video : videoId ,
        likedBy: req.user?._id
    })

    return res.status(200).json(200, videoLike, "Video Liked Successfully" )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new apiError(400, "Invalid Id")
    }

    const likedByUser = await  Like.findOne({
            likedBy: req.user?._id, 
            comment: commentId
    })

    if(likedByUser){
        const commentUnLike = await  Like.findByIdAndDelete(likedByUser._id)

        return res.status(200).json(new apiResponse(200, commentUnLike, "Comment Unliked Successfully"))
    }

    const commentLike = await  Like.create({
        comment : commentId ,
        likedBy: req.user?._id
    })

    return res.status(200).json(200, commentLike, "Comment Liked Successfully" )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new apiError(400, "Invalid Id")
    }

    const likedByUser = await  Like.findOne({
            likedBy: req.user?._id, 
            tweet: tweetId
    })

    if(likedByUser){
        const tweetUnLike = await  Like.findByIdAndDelete(likedByUser._id)

        return res.status(200).json(new apiResponse(200, tweetUnLike, "Tweet Unliked Successfully"))
    }

    const tweetLike = await  Like.create({
        tweet : tweetId ,
        likedBy: req.user?._id
    })

    return res.status(200).json(200, tweetLike, "Video Liked Successfully" )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await  Like.aggregate([
        {
            $match:{
                likedBy: req.user?._id
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"likedVideos",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"ownerDetails",
                        },
                    },
                    {
                        $unwind:"$ownerDetails",
                    },
                    {
                        $project:{
                            username:1,
                            fullName:1,
                            avatar:1,
                        }
                    }
                ],
            },
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $sort:{
                createdAt:-1
            }
        },
        {
            $project:{
                _id:0,
                likedVideos:{
                    _id:1,
                    videoFile:1,
                    thumbnail:1,
                    owner:1,
                    title:1,
                    views:1,
                    duration:1,
                    createdAt:1,
                    isPublished:1,
                    ownerDetails:1,
                }
            }
        }
    ]);

    return res
            .status(200)
            .json(new apiResponse(200, likedVideos, "All liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}