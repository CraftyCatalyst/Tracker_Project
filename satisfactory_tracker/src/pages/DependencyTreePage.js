//Mine
import React, { useState, useEffect, useMemo, useContext } from "react";
import Tree from "react-d3-tree";
import { Link } from 'react-router-dom';
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
import { formatHeader } from "../utils/formatHeader";

const DependencyTreePage = () => {
    const theme = useTheme();
    const { user } = useContext(UserContext);
    const { showAlert } = useAlert();
    const [parts, setParts] = useState([]);
    const [alternateRecipes, setAlternateRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [selectedPart, setSelectedPart] = useState("");
    const [selectedPartName, setSelectedPartName] = useState("");
    const [recipeName, setRecipeName] = useState("_Standard");
    const [recipeID, setRecipeID] = useState("");
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [treeData, setTreeData] = useState(null);
    const [visualData, setVisualData] = useState(null);
    const [flattenedData, setFlattenedData] = useState([]);
    const [error, setError] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState("");
    const [expandedNodes, setExpandedNodes] = useState([]);
    const [tabWidth, setTabWidth] = useState(0);
    const [isResizing, setIsResizing] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(tabWidth);
    const [trackerData, setTrackerData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [targetPartsPm, setTargetPartsPm] = useState(0);
    const [targetTimeframe, setTargetTimeframe] = useState(null);


    // Filter states
    const [partFilter, setPartFilter] = useState("");
    const [recipeFilter, setRecipeFilter] = useState("");
    const [recipes, setRecipes] = useState(filteredRecipes);
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);

    const fetchTreeData = async () => {
        try {
            console.log("Fetching Tree Data for Part:", selectedPart, "Recipe:", recipeName, "Target Quantity:", targetQuantity, "Target Parts PM:", targetPartsPm, "Target Timeframe:", targetTimeframe);
            const response = await axios.get(API_ENDPOINTS.build_tree, {
                params: {
                    part_id: selectedPart,
                    recipe_name: recipeName,
                    target_quantity: targetQuantity,
                    target_parts_pm: parseFloat(targetPartsPm),
                    target_timeframe: parseFloat(targetTimeframe),
                },
            });
            const tree = response.data;
            console.log("Fetched Tree Data:", tree);
            setTreeData(response.data); // Use the tree structure from the backend directly
            setFlattenedData(flattenTree(response.data)); // Flatten the tree for the DataGrid
            setVisualData(buildTreeData(response.data)); // Build the tree data structure for the visual tab
            // console.log("Fetched Tree Data:", response.data, treeData);
        } catch (error) {
            setError("Failed to fetch dependency tree. Check console for details.");
            console.error("Error fetching dependency tree:", error);
            // logToBackend("❌ Error fetching dependency tree: " + error, "ERROR");           
        }
    };


    // Build the tree data structure
    const buildTreeData = (node, parentId = "root", counter = { id: 1 }) => {
        // logToBackend("Building Tree Data for Node: " + node + "Parent ID: " + parentId, "INFO");
        // console.log("Building Tree Data for Node:", node, "Parent ID:", parentId); // Debug log
        const tree = [];
        if (!node || typeof node !== "object") return tree;

        for (const [key, value] of Object.entries(node)) {
            // console.log("Node Key:", key, "Value:", value); // Debug log
            if (!value || typeof value !== "object") continue;
            // Generate a unique ID for this node
            const uniqueId = `${parentId}-${counter.id++}`;
            // console.log(`Generated ID: ${uniqueId} for Node: ${key}`); // Debug log

            // Build the new node structure
            const newNode = {
                id: uniqueId,
                name: key,
                "Required Quantity": value["Required Quantity"] || "N/A",
                "Required Parts PM": value["Required Parts PM"] || "N/A",
                "Timeframe": value["Timeframe"] || "N/A",
                "Produced In": value["Produced In"] || "N/A",
                "No. of Machines": typeof value["No. of Machines"] === "number"
                    ? value["No. of Machines"].toFixed(2)
                    : "N/A",
                children: value.Subtree && typeof value.Subtree === "object"
                    ? buildTreeData(value.Subtree, uniqueId, counter)
                    : [],

            };
            // console.log("Current Node:", key, "Unique id:", uniqueId, "Subtree:", value.Subtree);

            if (!newNode.id || newNode.id === "undefined") {
                console.error("Node with missing ID:", newNode); // Catch undefined IDs
            }

            tree.push(newNode);
        }

        return tree;
    };

    const formatMinutesAsHMS = (minutes) => {
        if (!minutes || isNaN(minutes)) return "00:00:00";

        const totalSeconds = Math.round(minutes * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        const formattedTime = `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
        console.log("Formatted Time:", formattedTime);
        return formattedTime;
    };
    // Render the tree recursively
    const renderTree = (nodes) => {
        console.log("Rendering Tree Data:");
        return nodes.map((node) => {
            // console.log("Processing node:", node); // Log each processed node
            if (!node.id || node.id === "undefined") {
                console.error("Attempting to render a node with invalid ID:", node);
                return null; // Skip invalid nodes
            }

            // console.log("Rendering Node:", node.id, node.name); // Confirm valid node

            return (
                <TreeItem
                    itemId={node.id}
                    key={node.id}
                    nodeid={node.id}
                    label={
                        <Box sx={{ display: "flex", flexDirection: "column", fontSize: "14px" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <strong>{node.name}</strong>
                                <span>Qty: {node["Required Quantity"]}</span>
                                <span>Parts PM: {node["Required Parts PM"]}</span>
                                <span>Timeframe: {node["Timeframe"]}</span>
                                <span>Produced In: {node["Produced In"]}</span>
                                <span>No. of Machines: {node["No. of Machines"]}</span>
                                <span>Recipe: {node.Recipe}</span>
                            </div>
                        </Box>
                    }
                >
                    {node.children.length > 0 && renderTree(node.children)}
                </TreeItem>
            );
        });
    };

    const renderSpiderDiagram = () => {
        if (!flattenedData.length) {
            return <Typography>No data to display</Typography>;
        }

        const spiderData = transformSpiderData(flattenedData);

        return (
            <div id="treeWrapper" style={{ width: "100%", height: "600px" }}>
                <Tree
                    data={spiderData}
                    orientation="vertical"
                    translate={{ x: 400, y: 50 }}
                    nodeSize={{ x: 200, y: 100 }}
                    pathFunc="straight"
                />
            </div>
        );
    };

    const transformSpiderData = (rows) => {
        const nodeRegistry = {}; // Store references to existing nodes

        const root = {
            name: "Root",
            children: rows
                //.filter(row => row.Level === 0)
                .map(row => createSubTree(rows, row, nodeRegistry)),
        };
        return root;
    };

    const createSubTree = (rows, currentNode, nodeRegistry) => {
        // Use Part.id as the unique key
        const nodeKey = currentNode.id;

        // If the node already exists in the registry, reuse it
        if (nodeRegistry[nodeKey]) {
            return nodeRegistry[nodeKey];
        }

        // Otherwise, create a new node and store it in the registry
        const newNode = {
            name: currentNode.Node,
            attributes: {
                "Required Quantity": currentNode["Required Quantity"],
                "Required Parts PM": currentNode["Required Parts PM"],
                "Timeframe": currentNode["Timeframe"],
                "Produced In": currentNode["Produced In"],
                "No. of Machines": currentNode["No. of Machines"],
                "Part Supply PM": currentNode["Part Supply PM"],
                "Part Supply Quantity": currentNode["Part Supply Qty"],
                "Ingredient Demand PM": currentNode["Ingredient Demand PM"],
                "Ingredient Demand Quantity": currentNode["Ingredient Demand Qty"],
                Recipe: currentNode.Recipe,
            },
            children: rows
                .filter(row => row.Parent === currentNode.Node)
                .map(child => createSubTree(rows, child, nodeRegistry)),
        };

        nodeRegistry[nodeKey] = newNode; // Save the node to the registry
        return newNode;
    };

    const columns = [
        { field: 'id', headerName: 'ID', flex: 1 },
        { field: 'parent', headerName: 'Part', flex: 1 },
        { field: 'node', headerName: 'Ingredient', flex: 1 },
        { field: 'level', headerName: 'Level', flex: 1, type: 'number' },
        {
            field: 'requiredQuantity', headerName: 'Required Quantity', flex: 1, type: 'number',
            renderHeader: () => formatHeader("Required / Quantity"),

        },
        {
            field: "target_parts_pm", headerName: "Target Parts/Min", flex: 1, type: "number",
            renderHeader: () => formatHeader("Parts PM"),
        },
        {
            field: "target_timeframe", headerName: "Estimated Completion", flex: 1,
            renderHeader: () => formatHeader("Estimated / Completion"),
        },
        { field: 'producedIn', headerName: 'Produced In', flex: 1 },
        {
            field: 'machines', headerName: 'No. of Machines', flex: 1, type: 'number',
            renderHeader: () => formatHeader("No. of / Machines"),
        },
        { field: 'recipe', headerName: 'Recipe Name', flex: 1 },
        {
            field: "partSupplyPM", headerName: "Part Supply PM", flex: 1, type: "number",
            renderHeader: () => formatHeader("Part / Supply PM"),
        },
        {
            field: "partSupplyQty", headerName: "Part Supply Qty", flex: 1, type: "number",
            renderHeader: () => formatHeader("Part / Supply Qty"),
        },
        {
            field: "ingredientDemandPM", headerName: "Ingredient Demand PM", flex: 1, type: "number",
            renderHeader: () => formatHeader("Ingredient / Demand PM"),
        },
        {
            field: "ingredientDemandQty", headerName: "Ingredient Demand Qty", flex: 1, type: "number",
            renderHeader: () => formatHeader("Ingredient / Demand Qty"),
        },
        {
            field: "ingredientSupplyPM", headerName: "Ingredient Supply PM", flex: 1, type: "number",
            renderHeader: () => formatHeader("Ingredient / Supply PM"),
        },
        {
            field: "ingredientSupplyQty", headerName: "Ingredient Supply Qty", flex: 1, type: "number",
            renderHeader: () => formatHeader("Ingredient / Supply Qty"),            
        },
    ];
    // Flattened data for the DataGrid
    const rows = flattenedData.map((row, index) => ({
        id: index, // DataGrid requires a unique ID for each row
        parent: row.Parent,
        node: row.Node,
        level: row.Level,
        requiredQuantity: row['Required Quantity'],
        target_parts_pm: parseFloat(row['Required Parts PM']),
        target_timeframe: formatMinutesAsHMS(parseFloat(row['Timeframe'])),
        producedIn: row['Produced In'],
        machines: row['No. of Machines'],
        recipe: row.Recipe,
        partSupplyPM: row["Part Supply PM"] || null,
        partSupplyQty: row["Part Supply Quantity"] || null,
        ingredientDemandPM: row["Ingredient Demand PM"] || null,
        ingredientDemandQty: row["Ingredient Demand Quantity"] || null,
        ingredientSupplyPM: row["Ingredient Supply PM"] || null,
        ingredientSupplyQty: row["Ingredient Supply Quantity"] || null,
    }));
    console.log("Rows:", rows);

    // Collect all node IDs in the tree
    const collectAllNodeIds = (nodes) => {
        let ids = [];
        if (Array.isArray(nodes)) {
            nodes.forEach((node) => {
                ids.push(node.id); // Add current node ID
                if (node.children && node.children.length > 0) {
                    ids = ids.concat(collectAllNodeIds(node.children)); // Recursively collect child IDs
                }
            });
        } else if (nodes && typeof nodes === 'object') {
            ids.push(nodes.id); // Add current node ID
            if (nodes.children && nodes.children.length > 0) {
                ids = ids.concat(collectAllNodeIds(nodes.children)); // Recursively collect child IDs
            }
        }
        return ids;
    };

    const handleExpandAll = () => {
        if (visualData) {
            const allIds = collectAllNodeIds(visualData);
            setExpandedNodes(allIds);
            setIsExpanded(true); // Set expanded state
        }
    };

    const handleCollapseAll = () => {
        setExpandedNodes([]); // Collapse all nodes
        setIsCollapsed(true); // Set collapsed state
    };

    // Fetch parts and alternate recipes on component mount
    useEffect(() => {
        const fetchPartsAndRecipes = async () => {
            try {
                // console.log("Getting Part Names", API_ENDPOINTS.part_names);
                const partsResponse = await axios.get(API_ENDPOINTS.part_names);
                const partsData = partsResponse.data;
                setParts(Array.isArray(partsData) ? partsData : []);

                // console.log("Getting Alt Recipes", API_ENDPOINTS.alternate_recipe);
                const recipesResponse = await axios.get(API_ENDPOINTS.alternate_recipe);
                // console.log("Fetched Alternate Recipes:", recipesResponse.data);

                setAlternateRecipes(recipesResponse.data);
                setFilteredRecipes(recipesResponse.data); // Initialize filteredRecipes
                // #TODO: Load the selected recipes from the User's profile
                //setSelectedRecipes(recipesResponse.data.filter((recipe) => recipe.selected).map((r) => r.id));
                //setSelectedRecipes(response.data.map((recipe) => recipe.recipe_id));
            } catch (err) {
                console.error("Failed to fetch parts or recipes:", err);
                setParts([]);
                setAlternateRecipes([]);
            }
        };
        fetchPartsAndRecipes();
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

    // Flatten the tree structure for the DataGrid
    const flattenTree = (tree, parent = "", level = 0) => {
        const rows = [];
        Object.keys(tree).forEach((key) => {
            const node = tree[key];
            rows.push({
                Parent: parent || "Root",
                Node: key,
                Level: level,
                "Required Quantity": node["Required Quantity"] || "N/A",
                "Required Parts PM": node["Required Parts PM"] || "N/A",
                "Timeframe": node["Timeframe"] || "N/A",
                "Produced In": node["Produced In"] || "N/A",
                "No. of Machines": node["No. of Machines"] || "N/A",
                "Part Supply PM": node["Part Supply PM"] || "",
                "Part Supply Quantity": node["Part Supply Quantity"] || "",
                "Ingredient Demand PM": node["Ingredient Demand PM"] || "",
                "Ingredient Demand Quantity": node["Ingredient Demand Quantity"] || "",
                "Ingredient Supply PM": node["Ingredient Supply PM"] || "",
                "Ingredient Supply Quantity": node["Ingredient Supply Quantity"] || "",
                Recipe: node["Recipe"] || "N/A",
            });

            if (node.Subtree) {
                rows.push(...flattenTree(node.Subtree, key, level + 1));
            }
        });
        console.log("Flattened Rows:", rows);
        return rows;
    };


    const handleCheckboxChange = async (recipeId, partId) => {
        const recipeExists = selectedRecipes.includes(recipeId);
        // logToBackend("SelectedRecipes: " + selectedRecipes, "INFO");
        // logToBackend("Checkbox Change: Recipe ID: " + recipeId + " Part ID: " + partId + " Checked: " + recipeExists, "INFO");
        // Toggle the checkbox selection
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


    // Handle tab toggle
    const toggleTab = (tab) => {
        setActiveTab((prev) => {
            if (prev === tab) {
                setTabWidth(0); // Set tab width to 0 if the same tab is clicked
                return ""; // Collapse the tab
            } else {
                if (tabWidth === 0) {
                    setTabWidth(500); // Set tab width to 700px
                }
                return tab; // Set the active tab
            }
        });
    };

    const updateTrackerItem = async (id, updatedQuantity) => {
        try {
            await axios.put(`${API_ENDPOINTS.tracker_data}/${id}`, {
                target_quantity: updatedQuantity,
            });
            showAlert("success", "Quantity updated successfully.");
            fetchTrackerData(); // Refresh data
        } catch (error) {
            console.error("Error updating tracker item:", error);
            showAlert("error", "Failed to update quantity. Please try again.");
        }
    };

    const handleProcessRowUpdate = (newRow) => {
        const { id, target_quantity } = newRow;
        updateTrackerItem(id, target_quantity);
        return newRow; // Return the updated row to reflect changes in the grid
    };

    useEffect(() => {
        fetchTrackerData(); // Fetch data on component mount
    }, []);

    const fetchTrackerData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_ENDPOINTS.tracker_data);
            setTrackerData(response.data);
        } catch (error) {
            console.error("Error fetching tracker data:", error);
        } finally {
            setLoading(false);
        }
    };



    // Render the content based on the active tab
    const renderContent = () => {
        switch (activeTab) {
            case "alternateRecipes":
                // Filter the recipes
                const displayedRecipes = showSelectedOnly
                    ? filteredRecipes.filter((recipe) => selectedRecipes.includes(recipe.recipe_id))
                    : filteredRecipes;

                return (
                    <div>
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
                        </Box>

                        {/* Second Row: Show Selected Filter */}
                        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: theme.spacing(8) }}>
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
                            maxHeight: "700px",
                            overflow: "auto",
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
                    </div>
                );
            case "treeView":
                return (
                    <div>
                        <Typography> <strong>Dependency Treeview:</strong> </Typography>
                        {/* Buttons for Expand/Collapse */}
                        <           Box sx={{ display: "flex", gap: theme.spacing(1), mb: theme.spacing(2), mt: theme.spacing(1) }}>
                            <Button
                                variant="contained"
                                // color="secondary"
                                onClick={handleExpandAll}
                            >
                                Expand All
                            </Button>
                            <Button
                                variant="contained"
                                // color="secondary"
                                onClick={handleCollapseAll}
                            >
                                Collapse All
                            </Button>
                        </Box>
                        <Box sx={{ overflowY: "auto" }}>
                            {visualData.length > 0 ? (
                                <SimpleTreeView
                                    sx={{
                                        defaultCollapseIcon: "🔽",
                                        defaultExpandIcon: "▶",
                                    }}
                                    expandedItems={expandedNodes}
                                    onExpandedItemsChange={(event, nodeIds) => setExpandedNodes(nodeIds)}
                                >
                                    {renderTree(visualData)}
                                </SimpleTreeView>
                            ) : (
                                <Typography>No data to display</Typography>
                            )}
                        </Box>
                    </div>
                );
            case "spiderDiagram":
                return (
                    <div>
                        <Typography variant="h2" gutterBottom>
                            Spider Diagram
                        </Typography>
                        {renderSpiderDiagram()}
                    </div>
                );
        };
    };


    // Extract unique filter options
    const uniqueParts = [...new Set(alternateRecipes.map((recipe) => recipe.part_name))];
    const uniqueRecipes = [...new Set(alternateRecipes.map((recipe) => recipe.recipe_name))];

    // Render the page content
    return (
        <Box sx={{ display: "flex", height: "100vh" }}>
            {/* Main Content Section */}
            <Box
                sx={{
                    flex: activeTab ? 3 : 4, // Shrink when tab content is active
                    width: `calc(100% - ${tabWidth}px)`, // Subtract the tab width for the main content
                    transition: isResizing ? "none" : "width 0.2s ease",
                    padding: theme.spacing(2),
                    backgroundColor: theme.palette.background,
                    color: theme.palette.text.primary,
                    overflow: "hidden",
                }}
            >
                {/* Selection Inputs */}
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: theme.spacing(2),
                        marginBottom: theme.spacing(2),
                    }}
                >
                    {/* Select Part */}
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ marginBottom: theme.spacing(0.5) }}>Select Part:</label>
                        <select
                            value={selectedPart}
                            onChange={(e) => setSelectedPart(e.target.value)}
                            style={{
                                padding: theme.spacing(1),
                                borderRadius: theme.shape.borderRadius,
                                border: `1px solid ${theme.palette.text.disabled}`,
                                background: theme.palette.background.dropdown,
                                color: theme.palette.text.dropdown,
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
                        <label style={{ marginBottom: theme.spacing(0.5) }}>Target Quantity</label>
                        <input
                            type="number"
                            placeholder="Enter Quantity"
                            value={targetQuantity}
                            onChange={(e) =>
                                setTargetQuantity(e.target.value)}
                            style={{
                                padding: theme.spacing(1),
                                borderRadius: theme.shape.borderRadius,
                                border: `1px solid ${theme.palette.text.disabled}`,
                                background: theme.palette.background.dropdown,
                                color: theme.palette.text.dropdown,
                            }}
                        />
                    </Box>

                    {/* Target Parts per Minute */}
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <label style={{ marginBottom: theme.spacing(0.5) }}>Target Parts / Minute:</label>
                        <input
                            type="number"
                            value={targetPartsPm}
                            onChange={(e) => {
                                const newPartsPm = Number(e.target.value);
                                setTargetPartsPm(parseFloat(newPartsPm));
                                if (newPartsPm > 0) {
                                    setTargetTimeframe(targetQuantity / newPartsPm);
                                }
                            }}
                            placeholder="Auto or Manual"
                            style={{
                                padding: theme.spacing(1),
                                borderRadius: theme.shape.borderRadius,
                                border: `1px solid ${theme.palette.text.disabled}`,
                                background: theme.palette.background.dropdown,
                                color: theme.palette.text.dropdown,
                            }}
                        />
                    </Box>

                    {/* Target Timeframe */}
                    <Box sx={{ display: "flex", flexDirection: "column" }} >
                        <label style={{ marginBottom: theme.spacing(0.5) }}>Estimated Completion Time:</label>
                        <input
                            type="text"
                            value={formatMinutesAsHMS(parseFloat(targetTimeframe))}
                            disabled={true}
                            onChange={(e) => {
                                const newTimeframe = Number(e.target.value);
                                setTargetTimeframe(parseFloat(newTimeframe));
                                if (newTimeframe > 0) {
                                    setTargetPartsPm(targetQuantity / newTimeframe);
                                }
                            }}

                            placeholder=""
                            style={{
                                padding: theme.spacing(1),
                                borderRadius: theme.shape.borderRadius,
                                border: `1px solid ${theme.palette.text.disabled}`,
                                background: theme.palette.background.dropdown,
                                color: theme.palette.text.disabled,

                            }}
                        />
                    </Box>
                </Box>
                {/* Fetch Dependencies Button */}
                <Button
                    variant="contained"
                    onClick={fetchTreeData}
                    disabled={!selectedPart}
                    sx={{ marginBottom: theme.spacing(2) }}
                >
                    Fetch Dependencies
                </Button>

                {/* DataGrid */}
                <Box sx={{ flexGrow: 1, width: "100%" }}>
                    <div style={{ flexGrow: 1, overflow: "auto", height: "80vh", width: "100%" }}>
                        <DataGrid density="compact" rows={rows} columns={columns} loading={loading} />
                    </div>
                </Box>
            </Box>

            {/* Right Side: Content and Tabs Section */}
            <Box
                sx={{
                    width: activeTab ? `${tabWidth}px` : "0px",
                    transition: isResizing ? "none" : "width 0.2s ease",
                    borderLeft: `2px solid ${theme.palette.text.disabled}`,
                    overflow: "hidden",
                    backgroundColor: theme.palette.background,
                    color: theme.palette.text.primary,
                }}
            >
                {activeTab && (
                    <Box sx={{ padding: theme.spacing(2), height: "100%", overflowY: "auto" }}>
                        <Paper
                            sx={{
                                padding: theme.spacing(2),
                                backgroundColor: theme.palette.background,
                                color: theme.palette.text.primary,
                                borderRadius: theme.shape.borderRadius,
                            }}
                        >
                            {renderContent()}
                        </Paper>
                    </Box>
                )}
            </Box>

            {/* Static Tabs Column */}
            <Box
                sx={{
                    width: "100px",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: theme.palette.background,
                    borderLeft: `2px solid ${theme.palette.text.disabled}`,
                }}
            >
                {[
                    { id: "alternateRecipes", label: "Alternate Recipes" },
                    { id: "treeView", label: "Treeview", disabled: !treeData },
                    // { id: "spiderDiagram", label: "Spider Diagram" }
                ].map((tab) => (
                    <Button
                        key={tab.id}
                        onClick={() => toggleTab(tab.id)}
                        disabled={tab.disabled}
                        sx={{
                            textAlign: "center",
                            padding: theme.spacing(4),
                            gap: theme.spacing(1),
                            borderRadius: theme.shape.borderRadius,
                            backgroundColor: activeTab === tab.id
                                ? theme.palette.button.main
                                : theme.palette.button.main,
                            color: activeTab === tab.id
                                ? theme.palette.button.contrastText
                                : theme.palette.button.contrastText,
                            "&:hover": {
                                backgroundColor: theme.palette.button.hover,
                                color: theme.palette.button.contrastText,
                            },
                        }}
                    >
                        {tab.label}
                    </Button>
                ))}
            </Box>
        </Box>
    );
};

export default DependencyTreePage;
