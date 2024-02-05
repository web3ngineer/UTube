import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    if(!name || !description){
        throw new apiError(400,"Fill all the fields")
    }
    const playlist = await Playlist.create({
        name,
        description,
        owner:req.user
    });

    const createdPlaylist = await Playlist.findById(playlist._id);
    if(!createdPlaylist){
        throw new apiError(500, "Something went wrong creating playlist")
    }

    return res.status(201).json(
        new apiResponse(200, createdPlaylist, "Playlist Created Successfully")
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    const playlist = await Playlist.findOne({owner: userId})
    if(!playlist){
        throw new apiError(400, "No playlists found for this user")
    }

    if(!isValidObjectId(userId)){
        throw new apiError(400, "Invalid userId")
    }

    const usersPlaylist = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size : "$videos"
                },
                totalViews:{
                    $sum : "$videos.views"
                },
            }
        },
        {
            $project:{
                _id:1,
                name: 1,
                description:1,
                totalVideos:1,
                totalViews:1,
                updatedAt:1
            }
        }
    ])

    return  res.status(201).json(new apiResponse(200, usersPlaylist, "all user's playlist fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid Ids");
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(400, "Playlist not found")
    }

    const playlistById = await  Playlist.aggregate([
        { 
            $match : {
                '_id': new mongoose.Types.ObjectId(playlistId)
            } 
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videos"
            }
        },
        {
            $match: {
                'videos.isPublished': true,
            }
        },
        {
            $lookup:{
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                ad: 'owner'
            }
        },
        {
            $addFields:{
                totalVideos:{
                    $size: "$videos"
                },
                totalViews:{
                    $sum:"$videos.views"
                },
                owner:{
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ])

    return res
            .status(201)
            .json(new apiResponse(200, playlistById, "playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid Ids");
    }

    const video = Video.findById(videoId)
    if(!video){
        throw new apiError(400, "Video does not exists.")
    }

    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(400,"Playlist does not exist.")
    }

    if(playlist.owner !== req.user?._id){
        throw new apiError(400, "You are not authorized to perform this action.")
    }

    const addVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push:{
                videos : videoId
            }
        },
        {new: true}
    )
    return res.status(201).json(new apiResponse(201, addVideo, "Video Added Successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid Ids");
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new apiError(400, "Video does not exist")
    }

    const playlist = await  Playlist.findById(playlistId)
    if(!playlist){
        throw new apiError(400, 'Playlist not found')
    }

    if(playlist.owner !== req.user?._id){
        throw new apiError(403,'You do not have permission to perform this action')
    }

    const removedVideo = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                videos : {
                    "_id" : videoId
                }
            }
        },
        {new:true}
    )
    // console.log("removeVideo", removeVideo);

    return res
            .status(201)
            .json(new apiResponse(200, removedVideo, "Video removed successfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid PlaylistId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new apiError(400, "Playlist not found");
    }

    if (playlist.owner !== req.user?._id) {
        throw new apiError(400, "only owner can delete the playlist");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlist._id)
    if(!deletePlaylist){
        throw new apiError(500, "error while deleting playlist")
    }

    return res
            .status(200)
            .json(new apiResponse(200, deletedPlaylist, "Playlist deleted successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!name || !description){
        throw new apiError(400, "Please fill all the fields")
    }

    if (!isValidObjectId(playlistId)) {
        throw new apiError(400, "Invalid PlaylistId");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new apiError(400, "Playlist not found");
    }

    if (playlist.owner !== req.user?._id) {
        throw new apiError(400, "only owner can update the playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set:{
                name,
                description
            }
        },
        {new: true}
    )
    if(!updatePlaylist.success){
        throw new apiError(500,"playlist doesn't updated")
    }

    return res
            .status(201)
            .json(new apiResponse(200, updatedPlaylist, "Playlist updated successfully"))

})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}

