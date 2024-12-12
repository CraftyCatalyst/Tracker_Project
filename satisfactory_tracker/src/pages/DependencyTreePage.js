import React, { useState, useEffect } from "react";
import {
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
} from "@mui/material";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";

const DependencyTreePage = () => {
    const [parts, setParts] = useState([]);
    const [alternateRecipes, setAlternateRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [selectedPart, setSelectedPart] = useState("");
    const [recipeType, setRecipeType] = useState("_Standard");
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [treeData, setTreeData] = useState(null);
    const [flattenedData, setFlattenedData] = useState([]);
    const [error, setError] = useState("");


    // Filter states
    const [partFilter, setPartFilter] = useState("");
    const [recipeFilter, setRecipeFilter] = useState("");
    const [recipes, setRecipes] = useState(filteredRecipes);

    // Fetch parts and alternate recipes on component mount
    useEffect(() => {
        const fetchPartsAndRecipes = async () => {
            try {
                const partsResponse = await axios.get(API_ENDPOINTS.part_names);
                const partsData = partsResponse.data;
                setParts(Array.isArray(partsData) ? partsData : []);
                const recipesResponse = await axios.get(API_ENDPOINTS.alternate_recipes);
                console.log("Fetched Alternate Recipes:", recipesResponse.data);
                setAlternateRecipes(recipesResponse.data);
                setFilteredRecipes(recipesResponse.data); // Initialize filteredRecipes
                setSelectedRecipes(recipesResponse.data.filter((recipe) => recipe.selected).map((r) => r.id));
            } catch (err) {
                console.error("Failed to fetch parts or recipes:", err);
                setParts([]);
                setAlternateRecipes([]);
            }
        };
        fetchPartsAndRecipes();
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

    const handleFetchTree = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.build_tree, {
                params: {
                    part_id: selectedPart,
                    recipe_type: recipeType,
                    target_quantity: targetQuantity,
                    selected_recipes: selectedRecipes,
                },
            });
            const tree = response.data;
            setTreeData(tree);
            setFlattenedData(flattenTree(tree)); // Flatten the tree for the table
            setError("");
        } catch (err) {
            setError("Failed to fetch dependency tree. Check console for details.");
            console.error(err);
        }
    };

    const flattenTree = (tree, parent = "", level = 0) => {
        const rows = [];
        Object.keys(tree).forEach((key) => {
            const node = tree[key];
            rows.push({
                Parent: parent || "Root",
                Node: key,
                Level: level,
                "Required Quantity": node["Required Quantity"] || "N/A",
                "Produced In": node["Produced In"] || "N/A",
                "No. of Machines": node["No. of Machines"] || "N/A",
                Recipe: node["Recipe"] || "N/A",
            });

            if (node.Subtree) {
                rows.push(...flattenTree(node.Subtree, key, level + 1));
            }
        });
        return rows;
    };

    const handleCheckboxChange = (id) => {
        setSelectedRecipes((prev) =>
            prev.includes(id) ? prev.filter((recipeId) => recipeId !== id) : [...prev, id]
        );
    };

    // Extract unique filter options
    const uniqueParts = [...new Set(alternateRecipes.map((recipe) => recipe.part_name))];
    const uniqueRecipes = [...new Set(alternateRecipes.map((recipe) => recipe.recipe_name))];

    return (
        <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            {/* Left Side: Dependency Tree */}
            <Box
                sx={{
                    flex: 3,
                    border: "2px solid #ccc", // Border style
                    borderRadius: "8px", // Rounded corners
                    padding: "16px", // Inner padding
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Optional shadow for aesthetics
                    //backgroundColor: "#fff", // Optional background for contrast
                }}
            >
                <Typography variant="h1" color="primary" gutterBottom>
                    Dependency Tree Table
                </Typography>

                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: "16px",
                        marginBottom: "16px",
                    }}
                >
                    {/* Select Part */}
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ marginBottom: "4px" }}>Select Part:</label>
                        <select
                            value={selectedPart}
                            onChange={(e) => setSelectedPart(e.target.value)}
                            style={{
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                background: "#fff",
                            }}
                        >
                            <option value="">-- Select a Part --</option>
                            {parts.map((part) => (
                                <option key={part.id} value={part.id}>
                                    {part.name}
                                </option>
                            ))}
                        </select>
                    </Box>

                    {/* Target Quantity */}
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ marginBottom: "4px" }}>Target Quantity:</label>
                        <input
                            type="number"
                            placeholder="Enter Quantity"
                            value={targetQuantity}
                            onChange={(e) => setTargetQuantity(e.target.value)}
                            style={{
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                background: "#fff",
                            }}
                        />
                    </Box>
                </Box>

                <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleFetchTree}
                    disabled={!selectedPart}
                    sx={{ marginBottom: "16px" }}
                >
                    Fetch Dependency Tree
                </Button>

                {error && <Typography color="error">{error}</Typography>}

                <Box sx={{ marginTop: 4 }}>
                    {flattenedData.length > 0 ? (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Parent</TableCell>
                                        <TableCell>Node</TableCell>
                                        <TableCell>Level</TableCell>
                                        <TableCell>Required Quantity</TableCell>
                                        <TableCell>Produced In</TableCell>
                                        <TableCell>No. of Machines</TableCell>
                                        <TableCell>Recipe</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {flattenedData.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{row.Parent}</TableCell>
                                            <TableCell>{row.Node}</TableCell>
                                            <TableCell>{row.Level}</TableCell>
                                            <TableCell>{row["Required Quantity"]}</TableCell>
                                            <TableCell>{row["Produced In"]}</TableCell>
                                            <TableCell>{row["No. of Machines"]}</TableCell>
                                            <TableCell>{row.Recipe}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography>No data to display</Typography>
                    )}
                </Box>
            </Box>

            {/* Right Side: Alternate Recipes */}
            <Box
                sx={{
                    flex: 1,
                    border: "2px solid #ccc", // Border style
                    borderRadius: "8px", // Rounded corners
                    padding: "16px", // Inner padding
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Optional shadow for aesthetics
                    //backgroundColor: "#fff", // Optional background for contrast
                }}
            >
                <Typography variant="h2" color="primary" gutterBottom>
                    Alternate Recipes
                </Typography>
                {/* Filters */}
                <Box sx={{ display: "flex", gap: "16px", marginBottom: "16px", alignItems: "center" }}>
                    {/* Part Filter */}
                    <div>
                        <label>Filter by Part:</label>
                        <select
                            value={partFilter}
                            onChange={(e) => setPartFilter(e.target.value)}
                            style={{
                                marginLeft: "8px",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                background: "#fff",
                            }}
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
                            style={{
                                marginLeft: "8px",
                                padding: "8px",
                                borderRadius: "4px",
                                border: "1px solid #ccc",
                                background: "#fff",
                            }}
                        >
                            <option value="">-- Select Recipe --</option>
                            {uniqueRecipes.map((recipe, index) => (
                                <option key={index} value={recipe}>
                                    {recipe}
                                </option>
                            ))}
                        </select>
                    </div>
                </Box>

                {/* Filtered Table */}
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Part</TableCell>
                                <TableCell>Recipe</TableCell>
                                <TableCell>Select</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRecipes.map((recipe) => (
                                <TableRow key={recipe.id}>
                                    <TableCell>{recipe.recipe_name}</TableCell>
                                    <TableCell>{recipe.part_name}</TableCell>
                                    <TableCell>
                                        <Checkbox
                                            onChange={() => handleCheckboxChange(recipe.id)}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </div>
    );
};

export default DependencyTreePage;
