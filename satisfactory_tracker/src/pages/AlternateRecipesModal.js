import React, { useState, useEffect, useMemo, useContext } from "react";
import Tree from "react-d3-tree";
import { Link } from 'react-router-dom';
import {
    Modal,
    Typography,
    Button,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Checkbox,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    TextField,
} from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { SimpleTreeView } from "@mui/x-tree-view";
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import Tooltip from "@mui/material/Tooltip";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { UserContext } from '../context/UserContext';
import { useAlert } from "../context/AlertContext";
import logToBackend from '../services/logService';


const AlternateRecipesModal = ({ open, onClose }) => {
    const theme = useTheme();
    const { user } = useContext(UserContext);
    const { showAlert } = useAlert();
    const [alternateRecipes, setAlternateRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [error, setError] = useState("");
    const [selectedPart, setSelectedPart] = useState("");
    const [selectedPartName, setSelectedPartName] = useState("");
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [trackerData, setTrackerData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [partFilter, setPartFilter] = useState("");
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);
    const [parts, setParts] = useState([]);
    const [recipeName, setRecipeName] = useState("_Standard");
    const [recipeID, setRecipeID] = useState("");
    const [treeData, setTreeData] = useState(null);
    const [visualData, setVisualData] = useState(null);
    const [flattenedData, setFlattenedData] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState("");
    const [expandedNodes, setExpandedNodes] = useState([]);
    const [tabWidth, setTabWidth] = useState(0);
    const [isResizing, setIsResizing] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(tabWidth);
    const [recipeFilter, setRecipeFilter] = useState("");
    const [recipes, setRecipes] = useState(filteredRecipes);



    // Fetch parts and alternate recipes on component mount
    useEffect(() => {
        const fetchRecipes = async () => {
            try {
                // console.log("Getting Alt Recipes", API_ENDPOINTS.alternate_recipe);
                const recipesResponse = await axios.get(API_ENDPOINTS.alternate_recipe);

                setAlternateRecipes(recipesResponse.data);
                setFilteredRecipes(recipesResponse.data);

            } catch (err) {
                console.error("Failed to fetch alternate recipes:", err);
                setAlternateRecipes([]);
            }
        };
        fetchRecipes();
    }, []);

    useEffect(() => {
        const fetchSelectedRecipes = async () => {
            try {
                // Fetch user-selected recipes
                const selectedResponse = await axios.get(API_ENDPOINTS.selected_recipes);

                // Extract the recipe IDs for the selected recipes
                const selectedRecipeIds = selectedResponse.data.map((recipe) => recipe.recipe_id);

                setSelectedRecipes(selectedRecipeIds);

                // Fetch all alternate recipes for filtering and display
                // const alternateResponse = await axios.get(API_ENDPOINTS.alternate_recipe);
                // setFilteredRecipes(alternateResponse.data);
            } catch (error) {
                console.error("Error fetching recipes:", error);
            }
        };

        fetchSelectedRecipes();
    }, []);

    // Handle dropdown filters
    useEffect(() => {
        const applyFilters = () => {
            let filtered = alternateRecipes;

            if (partFilter) {
                filtered = filtered.filter((recipe) => recipe.part_name === partFilter);
            }

            if (recipeFilter) {
                filtered = filtered.filter((recipe) => recipe.recipe_name === recipeFilter);
            }

            setFilteredRecipes(filtered);
        };

        applyFilters();
    }, [partFilter, recipeFilter, alternateRecipes]);

    const handleCheckboxChange = async (recipeId, partId) => {
        const recipeExists = selectedRecipes.includes(recipeId);
        const updatedRecipes = recipeExists
            ? selectedRecipes.filter((id) => id !== recipeId)
            : [...selectedRecipes, recipeId];
        setSelectedRecipes(updatedRecipes);

        try {
            if (recipeExists) {
                // Send DELETE request to the backend when unchecked
                const response = await axios.delete(`${API_ENDPOINTS.selected_recipes}/${recipeId}`);
                if (response.status === 200) {
                    showAlert("success", "Recipe removed successfully.");
                    // console.log("Recipe removed successfully.");
                    setSelectedRecipes(selectedRecipes.filter((id) => id !== recipeId)); // Remove from the selectedRecipes array
                } else {
                    console.error("Unexpected response from backend:", response);
                }
            } else {
                // Send POST request to the backend when checked
                const response = await axios.post(API_ENDPOINTS.selected_recipes, {
                    part_id: partId,
                    recipe_id: recipeId,
                });
                if (response.status === 200) {
                    showAlert("success", "Recipe added successfully.");
                    // console.log("Recipe added successfully.");

                } else {
                    console.error("Unexpected response from backend:", response);
                }
            }
        } catch (error) {
            console.error("Error updating selected recipe:", error);
            showAlert("error", "Failed to update selected recipe.");
        }
    };

    //const renderContent = () => {
    const displayedRecipes = showSelectedOnly
        ? filteredRecipes.filter((recipe) => selectedRecipes.includes(recipe.recipe_id))
        : filteredRecipes;
    //};
    
    // Extract unique filter options
    const uniqueParts = [...new Set(alternateRecipes.map((recipe) => recipe.part_name))];
    const uniqueRecipes = [...new Set(alternateRecipes.map((recipe) => recipe.recipe_name))];
    

    return (
        <Modal
            open={open}
            onClose={onClose}
            // disableEscapeKeyDown  // 🔹 Prevent closing with ESC key
            sx={{ "& .MuiBackdrop-root": { pointerEvents: "none" } }}  // 🔹 Prevent clicking outside to close
        >
            <Box sx={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                bgcolor: "background.paper", padding: 4, borderRadius: 3, boxShadow: 24,
                width: "800px", maxWidth: "100%" // 🔹 Responsive width
            }}>
                <Typography variant="h2" gutterBottom>
                    Alternate Recipes
                </Typography>
                <Box sx={{ display: "flex", gap: theme.spacing(1), marginBottom: theme.spacing(1), alignItems: "center" }}>
                    {/* Part Filter */}
                    <div>
                        <label>Filter by Part:</label>
                        <select
                            value={partFilter}
                            onChange={(e) => setPartFilter(e.target.value)}
                        >
                            <option value="">-- Select Part --</option>
                            {uniqueParts.map((part, index) => (
                                <option key={index} value={part}>
                                    {part}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Recipe Filter */}
                    <div>
                        <label>Filter by Recipe:</label>
                        <select
                            value={recipeFilter}
                            onChange={(e) => setRecipeFilter(e.target.value)}
                        >
                            <option value="">-- Select Recipe --</option>
                            {uniqueRecipes.map((recipe, index) => (
                                <option key={index} value={recipe}>
                                    {recipe}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button
                        onClick={onClose}
                        variant="outlined"
                        fullWidth
                        sx={{ mt: 2, float: "right", borderColor: "#ff5722", color: "#ff5722", "&:hover": { backgroundColor: "#ffe0b2" } }}
                    >
                        Close
                    </Button>
                </Box>

                {/* Second Row: Show Selected Filter */}
                <Box sx={{ display: "flex", justifyContent: "left", alignItems: "center", marginTop: theme.spacing(8) }}>
                    <label style={{ display: "flex", alignItems: "center", gap: theme.spacing(1) }}>
                        Show Selected Only
                        <input
                            type="checkbox"
                            checked={showSelectedOnly}
                            onChange={(e) => setShowSelectedOnly(e.target.checked)}
                        />
                    </label>
                </Box>

                <TableContainer component={Paper} sx={{
                    marginTop: theme.spacing(1),
                    maxHeight: "700px", // ✅ Limits height to enable scrolling
                    overflow: "auto" // ✅ Enables scrollbars
                }}
                >
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Part</TableCell>
                                <TableCell>Recipe</TableCell>
                                <TableCell>Select</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {displayedRecipes.map((recipe, index) => (
                                <TableRow key={index}>
                                    <TableCell>{recipe.part_name}</TableCell>
                                    <TableCell>{recipe.recipe_name}</TableCell>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedRecipes.includes(recipe.recipe_id)}
                                            onChange={() => handleCheckboxChange(recipe.recipe_id, recipe.part_id)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Modal >
    );

};
export default AlternateRecipesModal;