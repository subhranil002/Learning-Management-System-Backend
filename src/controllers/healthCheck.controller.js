import { asyncHandler, ApiResponse } from "../utils/index.js";

export const healthCheck = asyncHandler(async (req, res, next) => {
    // Send response 200 OK
    return res.status(200).json(new ApiResponse("Up and running", {}));
});
