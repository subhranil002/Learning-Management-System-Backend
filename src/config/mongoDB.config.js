import mongoose from "mongoose";
import constants from "../constants.js";

const connectDB = async () => {
    try {
        // Connecting to MongoDB
        const connectionInstance = await mongoose.connect(constants.MONGO_URI, {
            dbName: constants.DB_NAME
        });

        console.log(`MongoDB Connected: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(
            "Error while connecting to MongoDB: ",
            error?.errorResponse
        );
        // Exit process with failure
        process.exit(1);
    }
};

export default connectDB;
