import React, { useState, useEffect, useMemo, useContext } from "react";
import Tree from "react-d3-tree";
import { Link } from 'react-router-dom';
import {
    Modal,
    Typography,
    Button,
    Box,
    Menu,
    MenuItem,
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

const AddToTrackerModal = ({ open, onClose }) => {
    const [selectedPart, setSelectedPart] = useState("");
    const [selectedPartName, setSelectedPartName] = useState("");
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [error, setError] = useState("");
    const [trackerData, setTrackerData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);
    const [partFilter, setPartFilter] = useState("");
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);
    const [parts, setParts] = useState([]);
    const { user } = useContext(UserContext);
    const theme = useTheme();
    const { showAlert } = useAlert();
    const [alternateRecipes, setAlternateRecipes] = useState([]);
    const [filteredRecipes, setFilteredRecipes] = useState([]);
    const [selectedRecipes, setSelectedRecipes] = useState([]);
    const [recipeName, setRecipeName] = useState("_Standard");
    const [recipeID, setRecipeID] = useState(0);
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
    const [assemblyPhases, setAssemblyPhases] = useState([]);
    const [selectedAssemblyPhase, setSelectedAssemblyPhase] = useState("");
    const [selectedAssemblyParts, setSelectedAssemblyParts] = useState([]);
    const [phaseDetails, setPhaseDetails] = useState(null);
    const [assemblyPhaseDetails, setAssemblyPhaseDetails] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedPhase, setSelectedPhase] = useState("");
    const [selectedPhaseName, setSelectedPhaseName] = useState("");



    // Fetch parts and alternate recipes on component mount
    useEffect(() => {
        const fetchParts = async () => {
            try {
                // console.log("Getting Part Names", API_ENDPOINTS.part_names);
                const partsResponse = await axios.get(API_ENDPOINTS.part_names);
                const partsData = partsResponse.data;
                setParts(Array.isArray(partsData) ? partsData : []);


            } catch (err) {
                console.error("Failed to fetch parts or recipes:", err);
                setParts([]);

            }
        };
        fetchParts();
    }, []);

    const handleAddToTracker = async (partId, targetQuantity, suppressAlert) => {
        // console.log("Adding Part to Tracker:", partId, targetQuantity, suppressAlert);
        try {
            let useRecipeId = 0;

            // #NEW call user_selected_recipe_check_part to check if the user has selected an alternate recipe for the passed in PartID, 
            // if it comes back with a result then set the variable useRecipeId=result otherwise let the if block below it fetch the standard
            // recipeID for that part.

            // console.log("Checking for user selected alternate recipe for Part:", partId);
            const response = await axios.get(API_ENDPOINTS.user_selected_recipe_check_part(partId));
            const userSelectedRecipe = response.data;

            if (userSelectedRecipe.length > 0) {
                useRecipeId = userSelectedRecipe[0].recipe_id;
                // console.log("Found User Selected Recipe ID:", useRecipeId);
            }

            if (useRecipeId === 0) {
                // console.log("Fetching _Standard for Part:", partId);
                const response = await axios.get(API_ENDPOINTS.get_recipe_id(partId), {
                    params: { recipe_name: recipeName },
                });
                const recipes = response.data;

                if (recipes.length === 0) {
                    showAlert("warning", "No recipe found for the selected part.");
                    return;
                }

                useRecipeId = recipes[0].id; // Extract the first recipe_id
                // console.log("Retrieved Recipe ID:", useRecipeId);
            }

            // console.log("Adding Part to Tracker:", partId, targetQuantity, useRecipeId);
            const addToTrackerResponse = await axios.post(API_ENDPOINTS.add_to_tracker, {
                partId,
                targetQuantity,
                recipeId: useRecipeId,
            });

            if (addToTrackerResponse.status === 200) {
                // console.log("Part added to tracker:", addToTrackerResponse.data);
                if (suppressAlert)
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
        fetchTrackerData();
        fetchAssemblyPhases();
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

    const fetchAssemblyPhases = async () => {
        // console.log("Fetching Assembly Phases...");
        try {
            const response = await axios.get(API_ENDPOINTS.get_assembly_phases);
            setAssemblyPhases(response.data);
            // console.log("Assembly Phases:", response.data);
            return response.data;

        } catch (error) {
            console.error("Error fetching assembly phases:", error);
        } finally {
            setLoading(false);
        }
    };

    
    const handleAddAssemblyPhaseParts = async () => {
        // console.log("Fetching Assembly Phases...");
        try {
            setLoading(true);
            // console.log("Fetching Assembly Phase Parts for Phase:", selectedPhase, selectedPhaseName);
            const response = await axios.get(API_ENDPOINTS.get_assembly_phase_parts(selectedPhase));
            setSelectedAssemblyParts(response.data);
            // console.log("Selected Assembly Parts:", response.data);

            // #NEW: call handleAddToTracker for each phase_part_id in selectedAssemblyParts, 
            // part=phase_part_id, target_quantity=phase_part_quantity and suppressAlert=true to the tracker

            await Promise.all(response.data.map(async (part) => {
                await handleAddToTracker(part.phase_part_id, part.phase_part_quantity, true);
            }));


            showAlert("success", "All parts added to your tracker!");
            fetchTrackerData(); // Refresh the tracker data
        } catch (error) {
            console.error("Error fetching tracker reports:", error);
        } finally {
            setLoading(false);
        }
    };


    const handleOpenMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const handleSelectPhase = (phase) => {
        setSelectedPhase(phase.id);
        setSelectedPhaseName(phase.phase_name);
        setAnchorEl(null); // Close menu
    };

    const selectedPartData = parts.find((part) => part.id === Number(selectedPart));
    const partName = selectedPartData ? selectedPartData.name : "Unknown Part";

    const selectedPartId = Number(selectedPart); // Convert selectedPart to a number
    // const selectedPartData = parts.find((part) => part.id === selectedPartId);
    // const partName = selectedPartData ? selectedPartData.name : "Unknown Part";
    const selectedPhaseData = assemblyPhases.find((phase) => phase.id === Number(selectedAssemblyPhase));
    const phaseName = selectedAssemblyPhase ? selectedAssemblyPhase.phase_name : "Unknown Phase";
    // console.log("User", user, "Part Data:", parts, "Selected Part ID:", selectedPartId, "Part Name:", partName);

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

    const fetchPhaseDetails = async (phaseId) => {
        try {
            const response = await axios.get(API_ENDPOINTS.get_assembly_phase_details(phaseId));
            setPhaseDetails(response.data);
        } catch (error) {
            console.error("Error fetching phase details:", error);
        }
    };




    useEffect(() => {
        const fetchPhaseDetails = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.get_all_assembly_phase_details);
                setAssemblyPhaseDetails(response.data);
                // console.log("Assembly Phase Details:", response.data);
            } catch (error) {
                console.error("Error fetching assembly phase details:", error);
            }
        };

        fetchPhaseDetails();
    }, []);


    return (
        <Modal
            open={open}
            onClose={onClose}
            // disableEscapeKeyDown  // 🔹 Prevent closing with ESC key
            sx={{ "& .MuiBackdrop-root": { pointerEvents: "none" } }}  // 🔹 Prevent clicking outside to close
        >
            {/* <Box sx={{ 
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                bgcolor: "background.paper", padding: 4, borderRadius: 3, boxShadow: 24,
                width: "800px", maxWidth: "100%", // 🔹 Responsive width
                height: "80vh", maxHeight: "100%", // 🔹 Responsive height
                overflow: "hidden"   // ✅ Ensures scrolling works properly
            }}> */}
            <Box sx={{
                display: "flex",
                flexDirection: "column",
                maxHeight: "100vh",
                overflow: "hidden",
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                bgcolor: "background.paper", padding: 4, borderRadius: 3, boxShadow: 24,
                width: "800px", maxWidth: "100%"
            }}>
                <Box sx={{ flexGrow: 1, overflow: "auto" }}>
                    <Typography variant="h2" gutterBottom>
                        My Tracking Goals
                    </Typography>

                    {/* Select Assembly Phase */}
                    <Box sx={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: theme.spacing(2),
                        gap: theme.spacing(2),
                        border: "2px solid white",
                        borderRadius: "8px",
                        padding: theme.spacing(2),
                        alignItems: "flex-end"
                    }}>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <label style={{ marginBottom: theme.spacing(0.5) }}>Select an Assembly Phase:</label>

                            <Button variant="outlined" onClick={handleOpenMenu}>
                                {selectedPhaseName || "-- Select an Assembly Phase --"}
                            </Button>

                            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
                                {assemblyPhaseDetails.map((phase) => (
                                    <Tooltip
                                        key={phase.id}
                                        title={
                                            <Box sx={{ maxWidth: "300px", padding: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                                    {phase.phase_name}
                                                </Typography>
                                                <Typography variant="body2">{phase.phase_description}</Typography>
                                                <Typography variant="body2" sx={{ fontWeight: "bold", marginTop: 1 }}>Needs:</Typography>
                                                <ul style={{ margin: 0, paddingLeft: 16 }}>
                                                    {phase.parts.map((part, index) => (
                                                        <li key={index} style={{ color: "#4FC3F7" }}>
                                                            {part.part_name} - {part.quantity}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Box>
                                        }
                                        arrow
                                        placement="right"
                                    >
                                        <MenuItem onClick={() => handleSelectPhase(phase)}>
                                            {phase.phase_name}
                                        </MenuItem>
                                    </Tooltip>
                                ))}
                            </Menu>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            {/* {selectedAssemblyPhase ? (
                                <Typography variant="body1">{phaseName}</Typography>
                            ) : (
                                <Typography variant="body1">No Phase Selected</Typography>
                            )} */}
                            <Button
                                variant="contained"
                                // color="secondary"
                                sx={{ marginLeft: theme.spacing(2) }}
                                onClick={() => handleAddAssemblyPhaseParts(phaseName)}
                                disabled={!selectedPhase}
                            >
                                Add all parts to Tracker
                            </Button>
                        </Box>



                    </Box>

                    {/* Select Part */}
                    <Box sx={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: theme.spacing(2),
                        gap: theme.spacing(2),
                        border: "2px solid white",
                        borderRadius: "8px",
                        padding: theme.spacing(2),
                        alignItems: "flex-end"
                    }}>
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
                            <label style={{ marginBottom: theme.spacing(0.5) }}>Target Total Quantity:</label>
                            <input
                                type="number"
                                placeholder="Enter Quantity"
                                value={targetQuantity}
                                onChange={(e) => setTargetQuantity(e.target.value)}
                                style={{
                                    padding: theme.spacing(1),
                                    borderRadius: theme.shape.borderRadius,
                                    border: `1px solid ${theme.palette.text.disabled}`,
                                    background: theme.palette.background.dropdown,
                                    color: theme.palette.text.dropdown,
                                }}
                            />
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            {/* {selectedPart ? (
                                <Typography variant="body1">{phaseName}</Typography>
                            ) : (
                                <Typography variant="body1">No Part Selected</Typography>
                            )} */}
                            <Button
                                variant="contained"
                                // color="secondary"
                                sx={{ marginLeft: theme.spacing(2) }}
                                onClick={() => handleAddToTracker(selectedPartId, targetQuantity, false)}
                                disabled={!selectedPart || !targetQuantity}
                            >
                                Add part to Tracker
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{
                        display: "flex",
                        flexDirection: "column",
                        // alignItems: "center",
                        marginBottom: theme.spacing(2),
                        gap: theme.spacing(2),
                        border: "2px solid white",
                        borderRadius: "8px",
                        padding: theme.spacing(2),
                    }}>
                        <Box sx={{ display: "flex", alignItems: "center", marginBottom: theme.spacing(1), gap: theme.spacing(2) }}>
                            <Typography
                                variant="body3"
                                sx={{ color: "#4FC3F7" }}
                            >
                                * Double-click on the <strong>Target Quantity</strong> field to edit. Press Enter to save. <br />
                                * Use the checkboxes to select rows for deletion then click on the <strong>Delete Selected</strong> button.
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", marginBottom: theme.spacing(2), gap: theme.spacing(2) }}>
                            <div style={{ flexGrow: 1, overflow: "auto", maxHeight: "50vh", width: "100%" }}>
                                <DataGrid
                                    density="compact"
                                    rows={rows}
                                    columns={columns}
                                    loading={loading}
                                    onRowSelectionModelChange={(ids) => setSelectedRows(ids)}
                                    processRowUpdate={handleProcessRowUpdate}
                                    experimentalFeatures={{ newEditingApi: true }}
                                />
                            </div>
                        </Box>
                        <Box sx={{ marginTop: theme.spacing(2), textAlign: "right", display: "flex", justifyContent: "space-between", alignContent: "center" }}>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleDeleteSelected}
                                disabled={selectedRows.length === 0}
                            >
                                Delete Selected
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="outlined"
                            // sx={{ mt: 3, float: "right", borderColor: "#ff5722", color: "#ff5722", "&:hover": { backgroundColor: "#ffe0b2" } }}
                            >
                                Close
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Modal >
    );

};

export default AddToTrackerModal;

