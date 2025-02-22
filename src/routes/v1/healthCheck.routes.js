import { Router } from "express";
import { healthCheck } from "../../controllers/healthCheck.controller.js";
const healthCheckRoutes = Router();

// Health check route
healthCheckRoutes.route("/").get(healthCheck);

export default healthCheckRoutes;
