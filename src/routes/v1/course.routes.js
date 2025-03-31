import { Router } from "express";
const courseRoutes = Router();
import {
    changeLectureVideo,
    changeThumbnail,
    createCourse,
    createLecture,
    deleteLecture,
    getAllCourses,
    getLecturesByCourseId,
    removeCourse,
    updateCourse,
    updateLecture,
    viewLecture,
} from "../../controllers/course.controller.js";
import {
    isLoggedIn,
    authorizedRoles,
    authorizedUser,
} from "../../middlewares/auth.middlewares.js";
import upload from "../../middlewares/multer.middleware.js";

courseRoutes
    .route("/create")
    .post(isLoggedIn, authorizedRoles("TEACHER", "ADMIN"), createCourse);
courseRoutes
    .route("/change-thumbnail/:id")
    .post(
        isLoggedIn,
        authorizedRoles("TEACHER", "ADMIN"),
        upload.single("thumbnail"),
        changeThumbnail
    );
courseRoutes
    .route("/update/:id")
    .post(isLoggedIn, authorizedRoles("TEACHER", "ADMIN"), updateCourse);
courseRoutes
    .route("/delete/:id")
    .get(isLoggedIn, authorizedRoles("TEACHER", "ADMIN"), removeCourse);
courseRoutes.route("/").get(getAllCourses);
courseRoutes
    .route("/:id/create")
    .post(isLoggedIn, authorizedRoles("TEACHER", "ADMIN"), createLecture);
courseRoutes
    .route("/:courseId/:lectureId")
    .post(
        isLoggedIn,
        authorizedRoles("TEACHER", "ADMIN"),
        upload.single("lecture"),
        changeLectureVideo
    );
courseRoutes
    .route("/:courseId")
    .get(isLoggedIn, authorizedUser, getLecturesByCourseId);
courseRoutes
    .route("/:courseId/view/:lectureId")
    .get(isLoggedIn, authorizedUser, viewLecture);
courseRoutes
    .route("/:courseId/update/:lectureId")
    .post(isLoggedIn, authorizedRoles("TEACHER", "ADMIN"), updateLecture);
courseRoutes
    .route("/:courseId/delete/:lectureId")
    .get(isLoggedIn, authorizedRoles("TEACHER", "ADMIN"), deleteLecture);

export default courseRoutes;
