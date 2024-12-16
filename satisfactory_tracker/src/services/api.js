import axios from 'axios';

// Create an Axios instance with the base URL
const apiClient = axios.create({
  baseURL: process.env.REACT_CLIENT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Export Axios instance for reuse
export default apiClient;

// Parts API
export const fetchParts = async () => {
  const response = await apiClient.get('/parts');
  return response.data;
};

export const createPart = async (partData) => {
  const response = await apiClient.post('/parts', partData);
  return response.data;
};

export const updatePart = async (partId, partData) => {
  const response = await apiClient.put(`/parts/${partId}`, partData);
  return response.data;
};

export const deletePart = async (partId) => {
  const response = await apiClient.delete(`/parts/${partId}`);
  return response.data;
};

// Recipes API
export const fetchRecipes = async () => {
  const response = await apiClient.get('/recipes');
  return response.data;
};

export const createRecipe = async (recipeData) => {
  const response = await apiClient.post('/recipes', recipeData);
  return response.data;
};

export const updateRecipe = async (recipeId, recipeData) => {
  const response = await apiClient.put(`/recipes/${recipeId}`, recipeData);
  return response.data;
};

export const deleteRecipe = async (recipeId) => {
  const response = await apiClient.delete(`/recipes/${recipeId}`);
  return response.data;
};

// Alternate Recipes API
export const fetchAlternateRecipes = async () => {
  const response = await apiClient.get('/alternate_recipes');
  return response.data;
};

export const createAlternateRecipe = async (alternateRecipeData) => {
  const response = await apiClient.post('/alternate_recipes', alternateRecipeData);
  return response.data;
};

export const updateAlternateRecipe = async (alternateRecipeId, alternateRecipeData) => {
  const response = await apiClient.put(`/alternate_recipes/${alternateRecipeId}`, alternateRecipeData);
  return response.data;
};

export const deleteAlternateRecipe = async (alternateRecipeId) => {
  const response = await apiClient.delete(`/alternate_recipes/${alternateRecipeId}`);
  return response.data;
};

// Power Shards API
export const fetchPowerShards = async () => {
  const response = await apiClient.get('/power_shards');
  return response.data;
};

export const createPowerShard = async (powerShardData) => {
  const response = await apiClient.post('/power_shards', powerShardData);
  return response.data;
};

export const updatePowerShard = async (powerShardId, powerShardData) => {
  const response = await apiClient.put(`/power_shards/${powerShardId}`, powerShardData);
  return response.data;
};

export const deletePowerShard = async (powerShardId) => {
  const response = await apiClient.delete(`/power_shards/${powerShardId}`);
  return response.data;
};

// Miner Supply API
export const fetchMinerSupply = async () => {
  const response = await apiClient.get('/miner_supply');
  return response.data;
};

export const createMinerSupply = async (minerSupplyData) => {
  const response = await apiClient.post('/miner_supply', minerSupplyData);
  return response.data;
};

export const updateMinerSupply = async (minerSupplyId, minerSupplyData) => {
  const response = await apiClient.put(`/miner_supply/${minerSupplyId}`, minerSupplyData);
  return response.data;
};

export const deleteMinerSupply = async (minerSupplyId) => {
  const response = await apiClient.delete(`/miner_supply/${minerSupplyId}`);
  return response.data;
};

// Miner Type API
export const fetchMinerType = async () => {
  const response = await apiClient.get('/miner_type');
  return response.data;
};

export const createMinerType = async (minerTypeData) => {
  const response = await apiClient.post('/miner_type', minerTypeData);
  return response.data;
};

export const updateMinerType = async (minerTypeId, minerTypeData) => {
  const response = await apiClient.put(`/miner_type/${minerTypeId}`, minerTypeData);
  return response.data;
};

export const deleteMinerType = async (minerTypeId) => {
  const response = await apiClient.delete(`/miner_type/${minerTypeId}`);
  return response.data;
};

// Node Purity API
export const fetchNodePurity = async () => {
  const response = await apiClient.get('/node_purity');
  return response.data;
};

export const createNodePurity = async (nodePurityData) => {
  const response = await apiClient.post('/node_purity', nodePurityData);
  return response.data;
};

export const updateNodePurity = async (nodePurityId, nodePurityData) => {
  const response = await apiClient.put(`/node_purity/${nodePurityId}`, nodePurityData);
  return response.data;
};

export const deleteNodePurity = async (nodePurityId) => {
  const response = await apiClient.delete(`/node_purity/${nodePurityId}`);
  return response.data;
};

// Build Dependency Tree API
export const buildDependencyTree = async (partId, recipeType = '_Standard', targetQuantity = 1) => {
  try {
    const response = await apiClient.get('/build_tree', {
      part_id: partId,
      recipe_type: recipeType,
      target_quantity: targetQuantity,
    });
    return response.data;
  } catch (error) {
    console.error('Error building dependency tree:', error);
    throw error;
  }
}

// User API
export const fetchUserInfo = async () => {
  const response = await apiClient.get('/user_info');
  return response.data;
};