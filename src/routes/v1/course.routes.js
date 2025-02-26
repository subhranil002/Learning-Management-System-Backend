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
    authorizedSubscriber,
} from "../../middlewares/auth.middlewares.js";
import upload from "../../middlewares/multer.middleware.js";

courseRoutes
    .route("/create")
    .post(isLoggedIn, authorizedRoles("ADMIN"), createCourse);
courseRoutes
    .route("/change-thumbnail/:id")
    .post(
        isLoggedIn,
        authorizedRoles("ADMIN"),
        upload.single("thumbnail"),
        changeThumbnail
    );
courseRoutes
    .route("/update/:id")
    .post(isLoggedIn, authorizedRoles("ADMIN"), updateCourse);
courseRoutes
    .route("/delete/:id")
    .get(isLoggedIn, authorizedRoles("ADMIN"), removeCourse);
courseRoutes.route("/").get(getAllCourses);
courseRoutes
    .route("/:id/create")
    .post(isLoggedIn, authorizedRoles("ADMIN"), createLecture);
courseRoutes
    .route("/:courseId/:lectureId")
    .post(
        isLoggedIn,
        authorizedRoles("ADMIN"),
        upload.single("lecture"),
        changeLectureVideo
    );
courseRoutes
    .route("/:id")
    .get(isLoggedIn, authorizedSubscriber, getLecturesByCourseId);
courseRoutes
    .route("/:courseId/view/:lectureId")
    .get(isLoggedIn, authorizedSubscriber, viewLecture);
courseRoutes
    .route("/:courseId/update/:lectureId")
    .post(isLoggedIn, authorizedRoles("ADMIN"), updateLecture);
courseRoutes
    .route("/:courseId/delete/:lectureId")
    .get(isLoggedIn, authorizedRoles("ADMIN"), deleteLecture);

export default courseRoutes;
