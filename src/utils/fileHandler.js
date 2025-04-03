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
            upload_preset: constants.CLOUDINARY_IMAGE_PRESET,
            moderation: constants.CLOUDINARY_IMAGE_MODERATION,
        });

        // Delete local files
        await deleteLocalFiles();

        if (
            response?.moderation?.length > 0 &&
            response?.moderation[0]?.status === "rejected"
        ) {
            throw new ApiError(
                "This image is not safe to upload, please upload a different image",
                400
            );
        }

        // Return public_id and secure_url
        return {
            public_id: response.public_id,
            secure_url: response.secure_url,
        };
    } catch (error) {
        await deleteLocalFiles();
        throw new ApiError(error.message, 500);
    }
};

const uploadVideoToCloud = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "video",
            upload_preset: constants.CLOUDINARY_VIDEO_PRESET,
        });

        await deleteLocalFiles();

        return {
            public_id: response.public_id,
            secure_url: response.secure_url,
            playback_url: response.playback_url,
        };
    } catch (error) {
        await deleteLocalFiles();
        throw new ApiError("Error while uploading video to Cloudinary", 500);
    }
};

const deleteCloudFile = async (public_id) => {
    try {
        if (!public_id) return true;

        const resource_type = public_id.split("_")[1].split("/")[0];

        await cloudinary.uploader.destroy(public_id, {
            resource_type: resource_type,
        });

        return true;
    } catch (error) {
        throw new ApiError(error, 500);
    }
};

const fileHandler = {
    deleteLocalFiles,
    uploadImageToCloud,
    uploadVideoToCloud,
    deleteCloudFile,
};

export default fileHandler;
