const generateAccessAndRefreshToken = async (user) => {
    try {
        // Generate access and refresh token
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        // Update refresh token
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Return access and refresh token
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            `Something went wrong while generating tokens ${error}`,
            500
        );
    }
};

export default generateAccessAndRefreshToken;
