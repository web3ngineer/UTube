import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        const connectionResponse = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`MongoDB connected !! DB HOST:${connectionResponse.connection.host}`);
        // console.log(connectionResponse);

    } catch (error) {
        console.log("MONGODB Connection error! ", error);
        process.exit(1)
    }
}

export default connectDB