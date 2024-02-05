import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({
    path: '.env',
})

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    // console.log(localFilePath);
    try {
        if (!localFilePath) return null;
        // upload the  file on cloudinary
        const response = await cloudinary.uploader.upload(
            localFilePath, 
            {resource_type: 'auto'}
        )
        //  file has been uploaded successfully 
        // console.log("file uploaded successfully on cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response;
            
    } catch (error) {
        // console.log("error :",error)
        fs.unlinkSync(localFilePath) // remove the localy saved temp file as the upload operation failed
        return null ;
    }
}

const deleteOnCloudinary = async (url) => {
    //  destructuring the url 
    const [_, cloudName, type, version, publicId, format] = url.match(/https?:\/\/res\.cloudinary\.com\/([^/]+)\/([^/]+)\/upload\/v(\d+)\/([^/]+)\.([^/]+)$/);
    // const [_, cloudName, version, publicId, format] = url.match(/https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/v(\d+)\/([^/]+)\.([^/]+)$/);
    // console.log(publicId)
    // console.log(type)
    try {
        if(!url) return null;
        const response = await cloudinary.uploader.destroy(
            publicId, 
            {resource_type:`${type}`}
        )
        return response;
    } catch (error) {
        return null;
    }
}

export {uploadOnCloudinary, deleteOnCloudinary}

//   cloudinary.v2.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });