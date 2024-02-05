import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params
    // TODO: toggle subscription

    const isSubscribed = await Subscription.findOne({
        channel: subscriberId,
        subscriber: req.user?._id
    })
    // console.log(isSubscribed)

    if(isSubscribed){
        const unSubscribed = await  Subscription.deleteOne({_id : isSubscribed._id})
        if(!unSubscribed){
            throw new apiError(500, "Could not remove your subscription",)
        }

        return res
                .status(201)
                .json(new apiResponse(200, unSubscribed, "Channel Unsubscribed Succesfully"))
    }

    const Subscribed = await  Subscription.create({
        subscriber: req.user?._id,
        channel: subscriberId
    });

    if(!Subscribed){
        throw new apiError(500, "Could not remove your subscription",)
    }

    return res
            .status(201)
            .json(new apiResponse(200, Subscribed, "Channel Subscribed Succesfully"))

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new apiError(400,"Invalid Channel ID")
    }

    const subscriber = await Subscription.aggregate([
        { 
            $match:{ 
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup:{
                            from: "subscriptions",
                            localField:"_id",
                            foreignField:"channel",
                            as: "subscribedToSubscriber"
                        },
                    },
                    {
                        $addFields:{
                            subscribedToSubscriber:{
                                $cond:{
                                    if:{
                                        $in:[new mongoose.Types.ObjectId(channelId), "$subscribedToSubscriber.subscriber"]
                                    },
                                    then: true,
                                    else: false,
                                }
                            },
                             subscriberCount:{
                                    $size : "subscribedToSubscriber"
                            },
                        },
                    },
                ]
            },
        },
        {
            "$unwind":"$subscriber"
        },
        {
            "$project":{
                _id: 0,
                subscriber:{
                    _id:1,
                    username:1,
                    fullName:1,
                    avatar:1,
                    subscribedToSubscriber:1,
                    subscriberCount:1,
                }
            }
        }
    ]);

    return res
            .status(201)
            .json(new apiResponse(200, subscriber, "Subscribers fetched successfully"));
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new apiError(400,"Invalid Subscriber ID")
    }

    const channel = await Subscription.aggregate([
        { 
            $match:{ 
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup:{
                            from: "subscriptions",
                            localField:"_id",
                            foreignField:"subscriber",
                            as: "subscribedToChannel"
                        },
                    },
                    {
                        $addFields:{
                            subscribedToChannel:{
                                $cond:{
                                    if:{
                                        $in:[new mongoose.Types.ObjectId(subscriberId), "$subscribedToChannel.channel"]
                                    },
                                    then: true,
                                    else: false,
                                }
                            },
                             subscribedChannelCount:{
                                    $size : "subscribedToChannel"
                            },
                        },
                    },
                ]
            },
        },
        {
            "$unwind":"$channel"
        },
        {
            "$project":{
                _id: 0,
                subscribedChannel:{
                    _id:1,
                    username:1,
                    fullName:1,
                    avatar:1,
                    subscribedToChannel:1,
                    subscribedChannelCount:1,
                }
            }
        }
    ])

    return res 
            .status(200)
            .json(new apiResponse(200, channel, "All channels are fetched successfully"))
})



export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
