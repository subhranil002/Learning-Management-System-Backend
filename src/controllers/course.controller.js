import mongoose from "mongoose";
import { Course } from "../models/index.js";
import {
    ApiError,
    ApiResponse,
    asyncHandler,
    fileHandler,
} from "../utils/index.js";

const createCourse = asyncHandler(async (req, res, next) => {
    try {
        const { title, description, category } = req.body;
        if (!title || !description || !category) {
            throw new ApiError("All fields are required", 400);
        }
        if (title.length > 50 || title.length < 5) {
            throw new ApiError(
                "Title should be greater than 5 and less than 50 characters",
                400
            );
        }
        if (description.length < 50) {
            throw new ApiError(
                "Description should be greater than 50 characters",
                400
            );
        }

        const existSameTitle = await Course.findOne({
            title: { $regex: new RegExp(`\^${title}$`, "i") },
        });
        if (existSameTitle) {
            throw new ApiError(
                "Course with same title already exists, please use different title",
                400
            );
        }

        const course = await Course.create({
            title,
            description,
            category,
            createdBy: {
                name: req.user.fullName,
                _id: req.user._id,
            },
        });
        if (!course) {
            throw new ApiError(
                "Course could not be created, please try again",
                500
            );
        }

        res.status(200).json(
            new ApiResponse("Course created successfully", course)
        );
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: createCourse: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const changeThumbnail = asyncHandler(async (req, res, next) => {
    try {
        // Get thumbnail file from request
        const thumbnailLocalPath = req.file ? req.file.path : "";

        // Check if thumbnail file is empty
        if (!thumbnailLocalPath) {
            throw new ApiError("No thumbnail file provided", 400);
        }

        // Find course by ID
        const { id } = req.params;
        const course = await Course.findById(id);
        if (!course) {
            throw new ApiError("Course not found", 404);
        }

        // Delete old thumbnail
        const result = await fileHandler.deleteCloudFile(
            course?.thumbnail?.public_id
        );
        if (!result) {
            throw new ApiError("Error deleting old thumbnail", 400);
        }

        // Upload thumbnail to Cloudinary
        const newThumbnail = await fileHandler.uploadImageToCloud(
            thumbnailLocalPath
        );
        if (!newThumbnail.public_id || !newThumbnail.secure_url) {
            throw new ApiError("Error uploading thumbnail", 400);
        }

        // Update course thumbnail
        const updatedCourse = await Course.findByIdAndUpdate(
            id,
            {
                thumbnail: {
                    public_id: newThumbnail.public_id,
                    secure_url: newThumbnail.secure_url,
                },
            },
            { new: true }
        );

        // Return updated user
        return res
            .status(200)
            .json(
                new ApiResponse(
                    "Thumbnail changed successfully",
                    updatedCourse.thumbnail
                )
            );
    } catch (error) {
        await fileHandler.deleteLocalFiles();
        return next(
            new ApiError(
                `course.controller :: changeThumbnail: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const updateCourse = asyncHandler(async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!id) {
            throw new ApiError("Course ID is required", 400);
        }

        const { title, description, category } = req.body;

        const course = await Course.findById(id);
        if (!course) {
            throw new ApiError("Course with given id doesnot exist", 404);
        }

        // Check if title is already taken (case-insensitive)
        if (title && title !== course.title) {
            const existingCourse = await Course.findOne({
                title: new RegExp(`^${title}$`, "i"),
            });
            if (existingCourse) {
                throw new ApiError(
                    "A course with this title already exists. Please choose a different title.",
                    400
                );
            }
        }

        const updatedFields = {};
        if (title) updatedFields.title = title;
        if (description) updatedFields.description = description;
        if (category) updatedFields.category = category;

        const updatedCourse = await Course.findByIdAndUpdate(
            id,
            updatedFields,
            {
                new: true,
            }
        ).select("-lectures");

        res.status(200).json(
            new ApiResponse("Course updated successfully", updatedCourse)
        );
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: updateCourse: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const removeCourse = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError("Course ID is required", 400);
        }

        const course = await Course.findById(id);
        if (!course) {
            throw new ApiError("Course with given id doesnot exist", 404);
        }

        await fileHandler.deleteCloudFile(course.thumbnail.public_id);
        course.lectures.forEach(async (lecture) => {
            await fileHandler.deleteCloudFile(lecture.lecture.public_id);
        });
        await Course.findByIdAndDelete(id);

        res.status(200).json(new ApiResponse("Course removed successfully"));
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: removeCourse: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const getAllCourses = asyncHandler(async (req, res, next) => {
    try {
        const courses = await Course.find()
            .select("-lectures")
            .sort({ createdAt: -1 });

        res.status(200).json(
            new ApiResponse("Courses fetched successfully", courses)
        );
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: getAllCourses: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const createLecture = asyncHandler(async (req, res, next) => {
    try {
        const { title, description } = req.body;
        const { id } = req.params;
        if (!title || !description || !id) {
            throw new ApiError("All fields are required", 400);
        }
        if (title.length > 50 || title.length < 5) {
            throw new ApiError(
                "Title should be greater than 5 and less than 50 characters",
                400
            );
        }
        if (description.length < 50) {
            throw new ApiError(
                "Description should be greater than 50 characters",
                400
            );
        }

        const course = await Course.findById(id);
        if (!course) {
            throw new ApiError("Course with given id doesnot exist", 404);
        }

        const lectureData = {
            _id: new mongoose.Types.ObjectId(),
            title,
            description,
        };

        course.lectures.push(lectureData);
        await course.save();

        res.status(200).json(
            new ApiResponse("Lecture created successfully", lectureData)
        );
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: createLecture: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const changeLectureVideo = asyncHandler(async (req, res, next) => {
    try {
        // Get lecture file from request
        const lectureLocalPath = req.file ? req.file.path : "";

        // Check if lecture file is empty
        if (!lectureLocalPath) {
            throw new ApiError("No lecture file provided", 400);
        }

        // Find course by ID
        const { courseId, lectureId } = req.params;
        if (!courseId || !lectureId) {
            throw new ApiError("Course ID and Lecture ID are required", 400);
        }

        // Find the course by its ID
        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError("Course not found", 404);
        }

        // Find the specific lecture within the course
        const lecture = course.lectures.find(
            (lec) => lec._id.toString() === lectureId
        );
        if (!lecture) {
            throw new ApiError("Lecture not found", 404);
        }

        if (
            req.user.role === "TEACHER" &&
            req.user._id !== course.createdBy._id
        ) {
            throw new ApiError("Unauthorized request", 403);
        }

        // Delete old lecture
        const result = await fileHandler.deleteCloudFile(
            lecture?.lecture?.public_id
        );
        if (!result) {
            throw new ApiError("Error deleting old lecture", 400);
        }

        // Upload lecture to Cloudinary
        const newLecture = await fileHandler.uploadVideoToCloud(
            lectureLocalPath
        );
        if (!newLecture.public_id || !newLecture.secure_url) {
            throw new ApiError("Error uploading lecture", 400);
        }

        const updatedlectures = course.lectures.map((lec) => {
            if (lec._id.toString() === lectureId) {
                return {
                    ...lec,
                    lecture: {
                        public_id: newLecture.public_id,
                        secure_url: newLecture.secure_url,
                    },
                };
            }
            return lec;
        });
        course.lectures = updatedlectures;
        await course.save();

        // Return updated user
        return res
            .status(200)
            .json(
                new ApiResponse(
                    "Thumbnail changed successfully",
                    course.lectures.find(
                        (lec) => lec._id.toString() === lectureId
                    ).lecture
                )
            );
    } catch (error) {
        await fileHandler.deleteLocalFiles();
        return next(
            new ApiError(
                `course.controller :: changeLectureVideo: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const getLecturesByCourseId = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new ApiError("Course ID is required", 400);
        }

        const course = await Course.findById(id).select("lectures");
        if (!course) {
            throw new ApiError("Invalid course ID", 404);
        }

        res.status(200).json(
            new ApiResponse("Lectures fetched successfully", course.lectures)
        );
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: getLecturesByCourseId: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const viewLecture = asyncHandler(async (req, res, next) => {
    try {
        const { courseId, lectureId } = req.params;
        if (
            !courseId ||
            courseId === "undefined" ||
            !lectureId ||
            lectureId === "undefined"
        ) {
            throw new ApiError("Course ID and Lecture ID are required", 400);
        }

        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError("Course not found", 404);
        }

        const lecture = course.lectures.find(
            (lec) => lec._id.toString() === lectureId
        );
        if (!lecture) {
            throw new ApiError("Lecture not found", 404);
        }

        res.status(200).json(
            new ApiResponse("Lecture fetched successfully", lecture)
        );
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: viewLecture: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const updateLecture = asyncHandler(async (req, res, next) => {
    try {
        const { courseId, lectureId } = req.params;

        if (
            !courseId ||
            courseId === "undefined" ||
            !lectureId ||
            lectureId === "undefined"
        ) {
            throw new ApiError("Course ID and Lecture ID are required", 400);
        }

        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError("Course not found", 404);
        }

        const lecture = course.lectures.find(
            (lec) => lec._id.toString() === lectureId
        );
        if (!lecture) {
            throw new ApiError("Lecture not found", 404);
        }

        if (
            req.user.role === "TEACHER" &&
            req.user._id !== course.createdBy._id
        ) {
            throw new ApiError("Unauthorized request", 403);
        }

        const { title, description } = req.body;
        if (!title && !description) {
            throw new ApiError("No fields to update", 400);
        }

        const updatedCourse = await Course.findOneAndUpdate(
            { _id: courseId, "lectures._id": lectureId },
            {
                $set: {
                    "lectures.$.title": title || lecture.title,
                    "lectures.$.description":
                        description || lecture.description,
                },
            },
            { new: true }
        );

        res.status(200).json(
            new ApiResponse(
                "Lecture updated successfully",
                updatedCourse.lectures.find(
                    (lec) => lec._id.toString() === lectureId
                )
            )
        );
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: updateLecture: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

const deleteLecture = asyncHandler(async (req, res, next) => {
    try {
        const { courseId, lectureId } = req.params;
        if (
            !courseId ||
            courseId === "undefined" ||
            !lectureId ||
            lectureId === "undefined"
        ) {
            throw new ApiError("Course ID and Lecture ID are required", 400);
        }

        const course = await Course.findById(courseId);
        if (!course) {
            throw new ApiError("Course not found", 404);
        }

        const lecture = course.lectures.find(
            (lec) => lec._id.toString() === lectureId
        );
        if (!lecture) {
            throw new ApiError("Lecture not found", 404);
        }

        if (
            req.user.role === "TEACHER" &&
            req.user._id !== course.createdBy._id
        ) {
            throw new ApiError("Unauthorized request", 403);
        }

        await fileHandler.deleteCloudFile(lecture?.lecture?.public_id);
        course.lectures = course.lectures.filter(
            (lec) => lec._id.toString() !== lectureId
        );
        await course.save();

        res.status(200).json(
            new ApiResponse("Lecture deleted successfully", course.lectures)
        );
    } catch (error) {
        return next(
            new ApiError(
                `course.controller :: deleteLecture: ${error}`,
                error.statusCode || 500
            )
        );
    }
});

export {
    createCourse,
    changeThumbnail,
    updateCourse,
    removeCourse,
    getAllCourses,
    createLecture,
    changeLectureVideo,
    updateLecture,
    getLecturesByCourseId,
    viewLecture,
    deleteLecture,
};
