import constants from "../constants.js";

const errorMiddleware = (err, req, res, next) => {
    // Get error details
    let { statusCode, message, stack } = err;

    if (constants.NODE_ENV === "development") {
        console.log("ErrorMiddleware: ", err);

        // Send error response
        return res.status(statusCode).json({
            success: false,
            message,
            stack
        });
    }

    // Capture the error message part only
    const errorPattern = / Error: (.*)/;
    const match = message.match(errorPattern);
    if (match && match[1]) {
        message = match[1].trim();
    } else {
        let parts = message.split("::");
        console.log(parts);
        message = parts[parts.length - 1].trim();
    }

    // Send error response
    return res.status(statusCode).json({
        success: false,
        message
    });
};

export default errorMiddleware;
