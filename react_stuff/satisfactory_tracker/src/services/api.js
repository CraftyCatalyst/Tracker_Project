import axios from 'axios';

// Create an Axios instance with the base URL
const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api', // Replace with your backend's URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export Axios instance for reuse
export default apiClient;