class ApiError extends Error {
    constructor(message, statusCode) {
        super(message || "Something went wrong");
        this.statusCode = Number(statusCode) || 500;
        this.data = null;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;