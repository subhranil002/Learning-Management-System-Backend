class ApiResponse {
    constructor(message = "Success", data = null) {
        this.success = true;
        this.message = message.toString();
        this.data = data;
    }
}

export default ApiResponse;