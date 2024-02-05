import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const {page = 1, limit = 10} = req.query

    // const allVideoComments = await Comment.find({video: videoId})
    //     .select('content')
    //     .limit(limit*1)
    //     .skip((page-1)*limit)
    //     .exec()

    // if(!allVideoComments){
    //     throw new apiError(400, "No comments found")
    // }

    // return res.status(201).json(new apiResponse(200, allVideoComments, "all video comments fetched succesfully"))
    const video = await Video.findById(videoId);
    if (!video) {
        throw new apiError(404, "Video not found");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                },
                isLiked: 1
            },
        },
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new apiResponse(200, comments, "Comments fetched successfully"));
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params
    const { content } = req.body;

    if(!content){
        throw new apiError(400, "please fill all the field")
    }

    const comment = await Comment.create({
        content,
        owner:req.user,
        video:videoId
    })
    // console.log(comment)

    const createdComment = await Comment.findById(comment._id)
    if(!createdComment){
        throw new apiError(500,"Server error while creating the comment")
    }

    return res
            .status(201)
            .json(new apiResponse(200, createdComment, "Comment Created Successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params
    const { content } = req.body

    if(!content){
        throw new apiError(400,'Please provide the updated content')
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new apiError(404,'The comment does not exist')
    }

    if(comment.owner !== req.user?._id){
        throw new  apiError(400, "You do not have permission to update this comment.")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment._id,
        {
            $set:{
                content
            }
        },
        {new:true}
    )
    
    if (!updatedComment) {
        throw new apiError(404, 'The comment with given ID was not found!')
    }

    return res
            .status(201)
            .json(new apiResponse(200, updatedComment, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)
    // console.log(comment)
    if(!comment){
        throw new apiError(404, "No comment with this id exists.")
    }

    if(comment.owner !== req.user?._id){
        throw new  apiError(400, "You do not have permission to delete this comment.")
    }

    const deletedComment = await Comment.deleteOne({"_id":comment._id})
    if(!deletedComment){
        throw new apiError(500,"Something went wrong while deleting the comment")
    }

    return res.status(201).json(new apiResponse(200, deletedComment, "comment deleted successfully"))
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}
