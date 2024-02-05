import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const pipeline = [];

    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // fetch videos only that are set isPublished as true
    pipeline.push({ $match: { isPublished: true } });

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new apiResponse(200, video, "Videos fetched successfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    const owner = req.user._id;

    if (!title || !description){
        throw new apiError(400, "Please fill all the fields")
    }

    const videoFilePath = req.files?.videoFile[0]?.path;
    // console.log(videoFilePath)
    if(!videoFilePath){
        throw new apiError(400, "Video path is required")
    }

    const thumbnailPath = req.files?.thumbnail[0]?.path;
    // console.log(thumbnailPath)
    if(!thumbnailPath ){
        throw new apiError(400, "thumbnail path is required")
    }
    
    const videoFile = await uploadOnCloudinary(videoFilePath);
    if(!videoFile){
        throw new apiError(500, "Video not uploaded")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailPath)
    if(!thumbnail){
        if(!thumbnail){
            throw new apiError(500, "Thumbnail not uploaded")
        }
    }
    // console.log(videoFile, thumbnail)
    // console.log(videoFile.duration)

    const video = await Video.create({
        title,
        description,
        videoFile:videoFile.url,
        thumbnail:thumbnail.url,
        duration: videoFile.duration,
        owner,
        isPublished: true,
    });

    const createdVideo = await Video.findById(video._id)
    if(!createdVideo){
        throw new apiError(400, 'CreatedVideo found')
    }

    return res.status(201).json(
    new apiResponse(200, createdVideo, "Video Uploaded Successfully")
   )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);
    return res.status(201).json(new apiResponse(200, video, "Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Id")
    }
    
    const {title, description} = req.body
    if(!title || !description){
        throw new apiError(400,"Please provide all the fields")
    }
    const video = await Video.findById(videoId);
    if(!video){
        throw new apiError(400, 'No video found')
    }

    if(video.owner.tostring() !== req.user?._id.tostring()){
        throw new apiError(400, "Only video owner can update the videos")
    }

    const thumbnailPath = req.file?.path;
    if(!thumbnailPath ){
        throw new apiError(400, "thumbnail path is required")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailPath);
    if(!thumbnail){
        throw new apiError(400, "thumbnail not uploaded")
    }
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                description,
                thumbnail: thumbnail.url,
            }
        }, {new:true}
    )
    if(!updatedVideo) {
        throw new apiError(404, 'The video with given ID was not found!')
    }
    // console.log(video.thumbnail)
    const deleteOldThumbnail = await deleteOnCloudinary(video.thumbnail)
    if(!deleteOldThumbnail){
        throw new apiError(400, "Error while deleting old thumbnail file")
    }

    return res.status(201).json( new apiResponse(200, updatedVideo, "Video Updated Succesfully"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Id")
    }

    let video = await Video.findById(videoId)
    if(!video){
        throw new apiError(400, 'No video found')
    }
    // console.log(video.videoFile)
    if(video.owner.tostring() !== req.user?._id.tostring()){
        throw new apiError(400, "Only video owner can delete the videos")
    }

    const deleteOldThumbnail = await deleteOnCloudinary(video.thumbnail)
    if(!deleteOldThumbnail){
        throw new apiError(400, "Error while deleting old thumbnail file")
    }

    const deleteOldVideo = await deleteOnCloudinary(video.videoFile)
    if(!deleteOldVideo){
        throw new apiError(400, "Error while deleting old video file")
    }

    const deletedVideo = await Video.deleteOne({"_id": video._id})
    if (!deletedVideo) {
        throw new apiError(500, 'Error while deleting data')
    }
    // await video.remove()

    return res.status(201).json( new apiResponse(200, deletedVideo, "Video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new apiError(400, "Invalid Id")
    }

    const video = await video.findById(videoId)
    if(!video){
        throw new apiError(400, "Video not Found")
    }

    if(video.owner.tostring() !== req.user?._id.tostring()){
        throw new apiError(400, "Only video owner can toggle the videos")
    }

    const toggle = await Video.findByIdAndUpdate(
        videoId,
        {
           $set:{
            isPublished: !isPublished
           }
        },
        {new: true} 
    )

    return res.status(201).json(new apiResponse(200, toggle, "Toggled Successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}

