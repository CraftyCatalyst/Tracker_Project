import axios from 'axios';
import { API_ENDPOINTS } from "../apiConfig";

const logToBackend = async (message, level = "INFO") => {
    try {
        await axios.post(API_ENDPOINTS.log, { message, level });
        // console.log(`[${level}] ${message}`);
    } catch (error) {
        console.error("Failed to send log to backend:", error);
    }
};

export const formatLogMessage = (title, content) => {
    return `
  *********${title}*************
  ${content}
  `;
  };

export default logToBackend;
