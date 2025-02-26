import "dotenv/config";

const constants = {
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    MONGO_URI: process.env.MONGO_URI,
    DB_NAME: process.env.DB_NAME,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_SECRET_KEY: process.env.CLOUDINARY_SECRET_KEY,
    CLOUDINARY_IMAGE_FOLDER: process.env.CLOUDINARY_IMAGE_FOLDER,
    CLOUDINARY_VIDEO_FOLDER: process.env.CLOUDINARY_VIDEO_FOLDER,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRE: process.env.ACCESS_TOKEN_EXPIRE,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_SECRET: process.env.RAZORPAY_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY
};

export default constants;
