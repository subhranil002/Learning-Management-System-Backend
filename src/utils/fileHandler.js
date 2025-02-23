import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import constants from "../constants.js";
import { ApiError } from "../utils/index.js";
import path from "path";
import { fileURLToPath } from "url";

// Delete all local files
const deleteLocalFiles = async () => {
    try {
        const tempDir = path.join(
            path.dirname(fileURLToPath(import.meta.url)),
            "../../public/temp"
        );

        if (fs.existsSync(tempDir)) {
            const files = await fs.promises.readdir(tempDir);

            await Promise.all(
                files.map(async (file) => {
                    if (file !== ".gitkeep") {
                        const filePath = path.join(tempDir, file);
                        await fs.promises.unlink(filePath);
                    }
                })
            );
        }
    } catch (error) {
        throw new ApiError("Error while deleting local files", 500);
    }
};

const uploadImageToCloud = async (localFilePath) => {
    // Check if localFilePath is empty
    if (!localFilePath) return null;

    try {
        // Upload image
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image",
            folder: constants.CLOUDINARY_FOLDER,
        });

        // Delete local files
        await deleteLocalFiles();

        // Return public_id and secure_url
        return {
            public_id: response.public_id,
            secure_url: response.secure_url,
        };
    } catch (error) {
        await deleteLocalFiles();
        throw new ApiError("Error while uploading image to Cloudinary", 500);
    }
};

const deleteCloudImage = async (publicId) => {
    try {
        // Check if publicId is empty
        if (!publicId) return true;

        // Delete image from Cloudinary
        await cloudinary.uploader.destroy(publicId);

        return true;
    } catch (error) {
        throw new ApiError("Error while deleting image from Cloudinary", 500);
    }
};

const fileHandler = {
    deleteLocalFiles,
    uploadImageToCloud,
    deleteCloudImage,
};

export default fileHandler;
