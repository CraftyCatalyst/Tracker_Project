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
import { SimpleTreeView } from "@mui/x-tree-view";
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import Tooltip from "@mui/material/Tooltip";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { UserContext } from '../UserContext';
import { useAlert } from "../context/AlertContext";

const DependencyTreePage = () => {
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
    const [flattenedData, setFlattenedData] = useState([]);
    const [error, setError] = useState("");
    const [isCollapsed, setIsCollapsed] = useState(false); // Track collapse state
    const [isExpanded, setIsExpanded] = useState(false); // Track collapse state
    const [activeTab, setActiveTab] = useState(""); // Track active tab ("" means no active tab)
    const [expandedNodes, setExpandedNodes] = useState([]); // Track expanded nodes
    const [tabWidth, setTabWidth] = useState(0); // Initial width for the Tab section
    const [isResizing, setIsResizing] = useState(false);
    const [startX, setStartX] = useState(0); // Track starting mouse position
    const [startWidth, setStartWidth] = useState(tabWidth); // Track starting width
    const [trackerData, setTrackerData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);

    // Filter states
    const [partFilter, setPartFilter] = useState("");
    const [recipeFilter, setRecipeFilter] = useState("");
    const [recipes, setRecipes] = useState(filteredRecipes);

    // const handleMouseDown = (e) => {
    //     //console.log("Mouse Down");
    //     setIsResizing(true);
    //     setStartX(e.clientX);
    //     setStartWidth(tabWidth);
    //     // Prevent text selection
    //     document.body.style.userSelect = "none";
    // };

    // const handleMouseMove = (e) => {
    //     if (tabWidth === 0) { return }; // Skip if the tab is collapsed

    //     const deltaX = startX - e.clientX; // Calculate the change in X position
    //     const newWidth = Math.max(0, startWidth + deltaX); // Calculate the new width
    //     setTabWidth(newWidth);
    //     //console.log("Mouse Position:", e.clientX, "Start X:", startX, "Tab Width:", tabWidth, "New Width:", newWidth, "Delta X:", deltaX);        
    // };

    // useEffect(() => {
    //     //console.log("Updated Tab Width:", tabWidth);
    // }, [tabWidth]);

    // const handleMouseUp = () => {
    //     //console.log("Mouse Up");
    //     setIsResizing(false);
    //     document.body.style.userSelect = ""; // Re-enable text selection
    // };

    // useEffect(() => {
    //     if (isResizing) {
    //         window.addEventListener("mousemove", handleMouseMove);
    //         window.addEventListener("mouseup", handleMouseUp);
    //     } else {
    //         window.removeEventListener("mousemove", handleMouseMove);
    //         window.removeEventListener("mouseup", handleMouseUp);
    //     }

    //     return () => {
    //         window.removeEventListener("mousemove", handleMouseMove);
    //         window.removeEventListener("mouseup", handleMouseUp);
    //     };
    // }, [isResizing]);


    const fetchTreeData = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.build_tree, {
                params: { part_id: selectedPart, target_quantity: targetQuantity },
            });

            const structuredData = buildTreeData(response.data);
            console.log("Structured Tree Data:", structuredData); // Debug to confirm all nodes
            setTreeData(structuredData);
        } catch (error) {
            console.error("Error fetching dependency tree:", error);
        }
    };


    // Build the tree data structure
    const buildTreeData = (node, parentId = "root", counter = { id: 1 }) => {
        console.log("Building Tree Data for Node:", node, "Parent ID:", parentId); // Debug log
        const tree = [];
        if (!node || typeof node !== "object") return tree;

        for (const [key, value] of Object.entries(node)) {
            console.log("Node Key:", key, "Value:", value); // Debug log
            if (!value || typeof value !== "object") continue; // Skip invalid nodes

            // Generate a unique ID for this node
            const uniqueId = `${parentId}-${counter.id++}`;
            console.log(`Generated ID: ${uniqueId} for Node: ${key}`); // Debug log

            // Build the new node structure
            const newNode = {
                id: uniqueId,
                name: key,
                "Required Quantity": value["Required Quantity"] || "N/A",
                "Produced In": value["Produced In"] || "N/A",
                "No. of Machines": value["No. of Machines"] || "N/A",
                children: value.Subtree && typeof value.Subtree === "object"
                    ? buildTreeData(value.Subtree, uniqueId, counter)
                    : [],

            };
            console.log("Current Node:", key, "Unique id:", uniqueId, "Subtree:", value.Subtree);

            if (!newNode.id || newNode.id === "undefined") {
                console.error("Node with missing ID:", newNode); // Catch undefined IDs
            }

            tree.push(newNode);
        }

        return tree;
    };

    // Render the tree recursively
    const renderTree = (nodes) => {
        console.log("Rendering Tree Data:");
        return nodes.map((node) => {
            if (!node.id || node.id === "undefined") {
                console.error("Attempting to render a node with invalid ID:", node);
                return null; // Skip invalid nodes
            }

            console.log("Rendering Node:", node.id, node.name); // Confirm valid node

            return (
                <TreeItem
                    itemId={node.id}
                    key={node.id}
                    nodeid={node.id}
                    label={
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong>{node.name}</strong>
                            <span>Qty: {node["Required Quantity"]}</span>
                            <span>Produced In: {node["Produced In"]}</span>
                            <span>No. of Machines: {node["No. of Machines"]}</span>
                            <span>Recipe: {node.Recipe}</span>
                        </div>
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
                "Produced In": currentNode["Produced In"],
                "No. of Machines": currentNode["No. of Machines"],
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
        { field: 'requiredQuantity', headerName: 'Required Quantity', flex: 1, type: 'number' },
        { field: 'producedIn', headerName: 'Produced In', flex: 1 },
        { field: 'machines', headerName: 'No. of Machines', flex: 1, type: 'number' },
        { field: 'recipe', headerName: 'Recipe Name', flex: 1 },
    ];
    // Flattened data for the DataGrid
    const rows = flattenedData.map((row, index) => ({
        id: index, // DataGrid requires a unique ID for each row
        parent: row.Parent,
        node: row.Node,
        level: row.Level,
        requiredQuantity: row['Required Quantity'],
        producedIn: row['Produced In'],
        machines: row['No. of Machines'],
        recipe: row.Recipe,
    }));

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
        if (treeData) {
            const allIds = collectAllNodeIds(treeData);
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
                console.log("Getting Alt Recipes", API_ENDPOINTS.part_names);
                const partsResponse = await axios.get(API_ENDPOINTS.part_names);
                const partsData = partsResponse.data;
                setParts(Array.isArray(partsData) ? partsData : []);
                console.log("Getting Alt Recipes", API_ENDPOINTS.alternate_recipe);
                const recipesResponse = await axios.get(API_ENDPOINTS.alternate_recipe);
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

    // Build the dependency tree
    const handleFetchTree = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.build_tree, {
                params: {
                    part_id: selectedPart,
                    recipe_name: recipeName,
                    target_quantity: targetQuantity,
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

    // Handle checkbox change
    const handleCheckboxChange = (id) => {
        setSelectedRecipes((prev) =>
            prev.includes(id) ? prev.filter((recipeId) => recipeId !== id) : [...prev, id]
        );
    };

    // Handle tab toggle
    const toggleTab = (tab) => {
        setActiveTab((prev) => {
            if (prev === tab) {
                setTabWidth(0); // Set tab width to 0 if the same tab is clicked
                return ""; // Collapse the tab
            } else {
                if (tabWidth === 0) {
                    setTabWidth(700); // Set tab width to 700px
                }
                return tab; // Set the active tab
            }
        });
    };

    const handleAddToTracker = async (partId, targetQuantity, recipeName) => {
        if (!user) {
            // Redirect to login page if user is not authenticated
            window.location.href = "/login";
            return;
        }

        try {
            console.log("Fetching Recipe ID for Part:", partId, "and Recipe Name:", recipeName);
            const response = await axios.get(API_ENDPOINTS.get_recipe_id(partId), {
                params: { recipe_name: recipeName },
            });
            const recipes = response.data;

            if (recipes.length === 0) {
                showAlert("warning", "No recipe found for the selected part and recipe name.");
                return;
            }

            const recipeId = recipes[0].id; // Extract the first recipe_id
            console.log("Retrieved Recipe ID:", recipeId);

            console.log("Adding Part to Tracker:", partId, targetQuantity, recipeId);
            const addToTrackerResponse = await axios.post(API_ENDPOINTS.add_to_tracker, {
                partId,
                targetQuantity,
                recipeId,
            });

            if (addToTrackerResponse.status === 200) {
                console.log("Part added to tracker:", addToTrackerResponse.data);
                showAlert("success", "Part added to your tracker!");
                fetchTrackerData(); // Refresh the tracker data
            } else {
                showAlert("error", addToTrackerResponse.data.error || "Failed to add part to tracker.");
            }
        } catch (error) {
            console.error("Error adding part to tracker:", error);
            showAlert("error", "Failed to add part to tracker. Please log in.");
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedRows.length === 0) {
            showAlert("warning", "Please select at least one item to delete.");
            return;
        }

        try {
            await Promise.all(
                selectedRows.map((id) =>
                    axios.delete(`${API_ENDPOINTS.tracker_data}/${id}`)
                )
            );
            showAlert("success", "Selected items deleted successfully.");
            fetchTrackerData(); // Refresh the data
            setSelectedRows([]); // Clear selected rows
        } catch (error) {
            console.error("Error deleting selected items:", error);
            showAlert("error", "Failed to delete selected items. Please try again.");
        }
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
        switch (activeTab ) { 
            case "alternateRecipes":
                return (
                    <div>
                        <Typography variant="h2" color="primary" gutterBottom>
                            Alternate Recipes
                        </Typography>
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
                    </div>
                );
            case "visualiseTree":
                return (
                    <div>
                        <Typography> <strong>Visualise Tree:</strong> </Typography>
                        {/* Buttons for Expand/Collapse */}
                        <           Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleExpandAll}
                            >
                                Expand All
                            </Button>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleCollapseAll}
                            >
                                Collapse All
                            </Button>
                        </Box>
                        <Box sx={{ overflowY: "auto" }}>
                            {treeData.length > 0 ? (
                                <SimpleTreeView
                                    sx={{
                                        defaultCollapseIcon: "🔽",
                                        defaultExpandIcon: "▶",
                                    }}
                                    // defaultCollapseIcon="🔽"
                                    // defaultExpandIcon="▶"
                                    expandedItems={expandedNodes}
                                    onExpandedItemsChange={(event, nodeIds) => setExpandedNodes(nodeIds)}
                                >
                                    {renderTree(treeData)}
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
                        <Typography variant="h2" color="primary" gutterBottom>
                            Spider Diagram
                        </Typography>
                        {renderSpiderDiagram()}
                    </div>
                );
            case "tracker":
                const selectedPartId = Number(selectedPart); // Convert selectedPart to a number
                const selectedPartData = parts.find((part) => part.id === selectedPartId);
                const partName = selectedPartData ? selectedPartData.name : "Unknown Part";
                console.log("User", user, "Part Data:", parts, "Selected Part ID:", selectedPartId, "Part Name:", partName);

                const columns = [
                    { field: "part_name", headerName: "Part", flex: 1 },
                    { field: "recipe_name", headerName: "Recipe", flex: 1 },
                    {
                        field: "target_quantity",
                        headerName: "Target Quantity",
                        flex: 1,
                        type: "number",
                        editable: true, // Enable inline editing                        
                    },
                    { field: "created_at", headerName: "Created At", flex: 1 },
                    { field: "updated_at", headerName: "Updated At", flex: 1 },
                ];

                const rows = trackerData.map((row, index) => ({
                    id: row.id || index, // Ensure a unique ID
                    ...row,
                }));
                return (
                    <Box>
                        <Box key={selectedPart} sx={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
                            <Typography variant="body1">{partName}, {recipeName}</Typography>
                            <Button
                                variant="contained"
                                color="secondary"
                                sx={{ marginLeft: 2 }}
                                onClick={() => handleAddToTracker(selectedPartId, targetQuantity, recipeName)}
                            >
                                Add to My Tracker
                            </Button>
                        </Box>
                        <Box>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                * Double-click on the <strong>Target Quantity</strong> field to edit. Press Enter to save.
                            </Typography>
                            <div style={{ height: 600, width: "100%" }}>
                                <DataGrid
                                    rows={rows}
                                    columns={columns}
                                    loading={loading}
                                    pageSize={5}
                                    rowsPerPageOptions={[5, 10]}
                                    checkboxSelection
                                    disableSelectionOnClick
                                    onRowSelectionModelChange={(ids) => setSelectedRows(ids)}
                                    processRowUpdate={handleProcessRowUpdate}
                                    experimentalFeatures={{ newEditingApi: true }}
                                />
                            </div>
                        </Box>

                        <Box sx={{ marginTop: 2, textAlign: "right" }}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleDeleteSelected}
                                disabled={selectedRows.length === 0}
                            >
                                Delete Selected
                            </Button>
                        </Box>
                    </Box>
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
                    padding: "16px",
                    background: "linear-gradient(to right, #000000, #0F705C)",
                    color: "#CCFFFF",
                    //transition: "flex 0.3s ease", // Smooth resize transition
                    // overflowY: "auto",
                    overflow: "hidden",
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
                    onClick={() => {
                        handleFetchTree();
                        fetchTreeData();
                    }}
                    disabled={!selectedPart}
                    sx={{ marginBottom: "16px" }}
                >
                    Fetch Dependencies
                </Button>

                {/* DataGrid */}
                <Box sx={{ height: 600, width: "100%" }}>
                    <DataGrid
                        rows={rows}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[5, 10, 20]}
                        checkboxSelection
                        disableSelectionOnClick
                        sortingOrder={['asc', 'desc']}
                        slots={{ toolbar: GridToolbar }}
                        slotProps={{
                            toolbar: {
                                showQuickFilter: true,
                            },
                        }}
                    />
                </Box>
            </Box>

            {/* Resizer */}
            {/* <Box
                sx={{
                    width: "5px",
                    cursor: "col-resize",
                    backgroundColor: "#00FFCC",
                }}
                onMouseDown={handleMouseDown}
            ></Box> */}

            {/* Right Side: Content and Tabs Section */}
            <Box
                sx={{
                    //flex: 1, // Expand when tab content is active
                    // width: activeTab ? "700px" : "0px", // Expand/collapse width
                    width: activeTab ? `${tabWidth}px` : "0px", // Expand/collapse width
                    transition: isResizing ? "none" : "width 0.2s ease",
                    //transition: "width 0.3s ease", // Smooth width transition
                    borderLeft: "2px solid #ccc",
                    overflow: "hidden", // Prevent content overflow when collapsed
                    backgroundColor: "#0A4B3E",
                    color: "#CCFFFF",
                    //resize: "horizontal",
                }}
            >
                {activeTab && (
                    <Box
                        sx={{
                            padding: "16px",
                            height: "100%",
                            overflowY: "auto",
                        }}
                    >
                        <Paper
                            sx={{
                                padding: "16px",
                                backgroundColor: "#0A4B3E",
                                color: "#CCFFFF",
                                borderRadius: "8px",
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
                    width: "100px", // Fixed width for tabs
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "#0A4B3E",
                    borderLeft: "2px solid #ccc",
                }}
            >
                <Button
                    onClick={() => toggleTab("alternateRecipes")}
                    sx={{
                        textAlign: "center",
                        padding: "8px",
                        borderRadius: 2,
                        borderWidth: "0 0 2px 1",
                        backgroundColor: activeTab === "alternateRecipes" ? "#00FFCC" : "#0A553E",
                        color: activeTab === "alternateRecipes" ? "#000" : "#CCFFFF",
                        "&:hover": { backgroundColor: "#00FFCC", color: "#000" },
                    }}
                >
                    Alternate Recipes
                </Button>
                <Button
                    onClick={() => toggleTab("visualiseTree")}
                    disabled={!treeData}
                    sx={{
                        textAlign: "center",
                        padding: "8px",
                        borderRadius: 2,
                        backgroundColor: activeTab === "visualiseTree" ? "#00FFCC" : "#0A5A3E",
                        color: activeTab === "visualiseTree" ? "#000" : "#CCFFFF",
                        "&:hover": { backgroundColor: "#00FFCC", color: "#000" },
                    }}
                >
                    Visualise Tree
                </Button>
                <Button
                    onClick={() => toggleTab("tracker")}
                    disabled={!treeData}
                    sx={{
                        textAlign: "center",
                        padding: "8px",
                        borderRadius: 2,
                        backgroundColor: activeTab === "tracker" ? "#00FFCC" : "#0A5F3E",
                        color: activeTab === "tracker" ? "#000" : "#CCFFFF",
                        "&:hover": { backgroundColor: "#00FFCC", color: "#000" },
                    }}
                >
                    Tracker
                </Button>
                <Button
                    onClick={() => toggleTab("spiderDiagram")}
                    sx={{
                        textAlign: "center",
                        padding: "8px",
                        borderRadius: 2,
                        backgroundColor: activeTab === "spiderDiagram" ? "#00FFCC" : "#0A5F3E",
                        color: activeTab === "spiderDiagram" ? "#000" : "#CCFFFF",
                        "&:hover": { backgroundColor: "#00FFCC", color: "#000" },
                    }}
                >
                    Spider Diagram
                </Button>
            </Box>
        </Box>
    );
};
export default DependencyTreePage;