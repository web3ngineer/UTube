// require('dotenv').config({path:'../.env'})
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { DB_NAME } from './constants.js';
import connectDB from './db/db.index.js';
import { app } from './app.js';

dotenv.config({
    path: '.env',
})


connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running at port : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MONGODB connection failed !!!", err);
})








/*
// function connectDB(){
// }
// connectDB()
// instead f using normal function use iife

import express from 'express';
const app = express()

;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)

        app.on("error", (error) => {
            console.log("ERROR:", error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log('Server is running on port', process.env.PORT);
        })

    } catch (error) {
        console.error("ERROR:", error);
        throw error;
    }
})()
*/

