import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content }= req.body
    // const owner = req.user
    // console.log(content)

    if(!content){
        throw new apiError(400, "content can't be empty")
    }

    const tweet = await Tweet.create({
        content:content,
        owner:req.user,
    })
    // console.log(tweet)

    const createdTweet = await Tweet.findById(tweet._id)
    if(!createdTweet){
        throw new apiError(400,"tweet not created")
    }

    return res.status(201).json(new apiResponse(200, createdTweet, "Tweet Created Succesfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params

    const user = await User.findById(userId)
    if(!user){
        throw new apiError(400, "User Doesn't Exists")
    }

    const UserTweet = await Tweet.aggregate([
        {
            $match:{
                owner : new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline:[
                    {
                        "$project" : {
                            username:1,
                            avatar:1,
                        }
                    }
                ]
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
                pipeline:[
                    {
                        "$project" : {
                            likedBy:1,
                        }
                    }
                ]
            },
        },
        {
            $addFields : {
                isLikedByUser : {
                    $cond: {
                        if :{
                            $in : [ req.user?._id, "$likes.likedBy" ]
                        },
                        then: true,
                        else: false,
                    }
                },
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first : "$owner"
                }, 
            },
        },
        {
            $project: {
                content:1,
                owner:1,
                likesCount:1,
                isLikedByUser:1,
                createdAt:1,
            },
        },
    ])

    return res
            .status(201)
            .json(new apiResponse(200, UserTweet, "All the tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    const { content } = req.body;

    if(!content){
        throw new apiError(400,'Content is missing to update a tweet');
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new apiError(400, 'The tweet with given ID was not found')
    }

    if (tweet.owner !== req.user._id) {
        throw new apiError(403, 'You are not authorized to perform this action');
    }

    const updateTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            }
        },
        { new: true}
    )

    return res
            .status(201)
            .json(new apiResponse(200, updateTweet, "Tweet updated succesfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new apiError(400, 'The tweet with given ID does not exist')
    }

    if (tweet.owner !== req.user._id) {
        throw new apiError(403, 'You are not authorized to perform this action');
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweet._id)

    if (!deletedTweet) {
        throw new apiError(500, 'Error while deleting data')
    }
    // await video.remove()

    return res
            .status(201)
            .json( new apiResponse(200, deletedTweet, "Video deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
