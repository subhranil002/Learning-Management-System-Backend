import { v2 as cloudinary } from "cloudinary";
import constants from "../constants.js";

const connectCloudinary = async () => {
    try {
        // Configuring Cloudinary
        cloudinary.config({
            cloud_name: constants.CLOUDINARY_CLOUD_NAME,
            api_key: constants.CLOUDINARY_API_KEY,
            api_secret: constants.CLOUDINARY_SECRET_KEY
        });

        // Ping to verify connection
        await cloudinary.api.ping();
        console.log("Connected to Cloudinary");
    } catch (error) {
        console.log(
            "Error while connecting to Cloudinary: ",
            error
        );
    }
};

export default connectCloudinary;
