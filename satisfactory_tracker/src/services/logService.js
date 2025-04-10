import axios from 'axios';
import { API_ENDPOINTS } from "../apiConfig";

const centralLogging = async (message, source='FRONTEND', level = "INFO", title=null) => {
    try {
        const response = await axios.post(API_ENDPOINTS.log, { message, source, level, title });
        message = response.data.log;
        console.log(`[${level}] ${message}`);
    } catch (error) {
        console.error("Failed to send log to backend:", error);
    }
};

export default centralLogging;

// Example usage in a component or service //
//
// import centralLogging from './path/to/logService';
// 
// centralLogging("Page/Function", "This is an info message", "INFO");
// centralLogging("Page/Function", "This is a warning message", "WARNING");
// centralLogging("Page/Function", "This is an error message", "ERROR");
// centralLogging("Page/Function", "This is a debug message", "DEBUG");
// centralLogging("Page/Function", "This is a critical message", "CRITICAL");
// centralLogging("Page/Function", "This is a message with a title", "INFO", "Custom Title");
