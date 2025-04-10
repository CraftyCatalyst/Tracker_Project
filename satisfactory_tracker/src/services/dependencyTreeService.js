import axios from 'axios';
import centralLogging from "../services/logService";

axios.defaults.withCredentials = true;

// centralLogging("api.js - Run Mode: " + process.env.REACT_APP_API_BASE_URL, "INFO");
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,  
});

export const getPartNames = async () => {
    try {
      const response = await axios.get('/api/part_names');
      return response.data; // Should be an array of { id, name }
    } catch (error) {
      console.error('Error fetching part names:', error);
      throw error;
    }
};

export const buildDependencyTree = async (partId, recipeType = '_Standard', targetQuantity = 1) => {
  try {
    const response = await axios.get('/api/build_tree', {
      part_id: partId,
      recipe_type: recipeType,
      target_quantity: targetQuantity,
    });
    return response.data;
  } catch (error) {
    console.error('Error building dependency tree:', error);
    throw error;
  }
};