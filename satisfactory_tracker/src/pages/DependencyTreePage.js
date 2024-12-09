import React, { useState, useEffect } from "react";
import { Typography, Button, Box } from "@mui/material";
import { buildDependencyTree } from "../services/dependencyTreeService";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";

const DependencyTreePage = () => {
    const [parts, setParts] = useState([]); // Holds the list of parts
    const [selectedPart, setSelectedPart] = useState(""); // Holds the selected part ID
    const [recipeType, setRecipeType] = useState("_Standard");
    const [targetQuantity, setTargetQuantity] = useState(1);
    const [treeData, setTreeData] = useState(null);
    const [error, setError] = useState("");

    // Fetch parts on component mount
    useEffect(() => {
        const fetchParts = async () => {
            try {
                console.log("Fetching parts...");
                const response = await axios.get(API_ENDPOINTS.part_names);
                console.log("API_ENDPOINTS.part_names:", API_ENDPOINTS.part_names);
                const partsData = response.data;
                console.log("Fetched parts:", partsData);
                setParts(Array.isArray(partsData) ? partsData : []);
            } catch (err) {
                console.error("Failed to fetch parts:", err);
                setParts([]); // Default to empty array on error
            }
        };
        fetchParts();
    }, []);

    const handleFetchTree = async () => {
        try {
            console.log("Fetching dependency tree for part:", selectedPart, "Recipe Type:", recipeType, "Target quantity:", targetQuantity);
            const url = `${API_ENDPOINTS.build_tree}?part_id=${selectedPart}&recipe_type=${recipeType}&target_quantity=${targetQuantity}`;
            console.log("URL:", url);
            const data = await axios.get(url);
            // const data = await axios.get(API_ENDPOINTS.build_tree, {selectedPart, recipeType, targetQuantity});
            console.log("API_ENDPOINTS.build_tree:", API_ENDPOINTS.build_tree);
            const treedata = data.data;
            console.log("Fetched dependency tree:", data.data);
            //const data = await buildDependencyTree(selectedPart, recipeType, targetQuantity);
            setTreeData(treedata);
            setError("");
        } catch (err) {
            setError("Failed to fetch dependency tree. Check console for details.");
            console.error(err);
        }
    };

    const renderTree = (node, depth = 0) => {
        if (!node) return null;
        return (
            <Box sx={{ marginLeft: depth * 2 }}>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {node.name} (Qty: {node.required_quantity})
                </Typography>
                {node.subtree &&
                    Object.keys(node.subtree).map((key) =>
                        renderTree(node.subtree[key], depth + 1)
                    )}
            </Box>
        );
    };

    return (
        <div>
            <Typography variant="h1" color="primary" gutterBottom>
                Dependency Tree Page
            </Typography>
        
            <div>
                <label>Select Part:</label>
                <select value={selectedPart} onChange={(e) => setSelectedPart(e.target.value)}>
                    <option value="">-- Select a Part --</option>
                    {Array.isArray(parts) && parts.length > 0 ? (
                        parts.map((part) => (
                            <option key={part.id} value={part.id}>
                                {part.name}
                            </option>
                        ))
                    ) : (
                        <option disabled>No parts available</option>
                    )}
                </select>
            </div>
            
            <input
                type="number"
                placeholder="Target Quantity"
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(e.target.value)}
                style={{ marginRight: "16px" }}
            />
            <Button
                variant="contained"
                color="secondary"
                sx={{
                  marginTop: 2,
                  color: 'secondary.contrastText', // Ensures text matches theme
                  backgroundColor: 'secondary.main', // Ensures background matches theme
                  }}
                onClick={handleFetchTree}
                disabled={!selectedPart}
            >
                Fetch Dependency Tree
            </Button>
            {error && <Typography color="error">{error}</Typography>}
            <Box sx={{ marginTop: 4 }}>
                {treeData ? renderTree(treeData) : <Typography>No data to display</Typography>}
            </Box>
        </div>
    );
};

export default DependencyTreePage;
