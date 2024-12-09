import React, { useState, useEffect } from "react";
import { Typography, Button, Select, MenuItem, Box } from "@mui/material";
import { buildDependencyTree, getParts } from "../services/dependencyTreeService";

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
        const partsData = await getParts();
        setParts(partsData);
      } catch (err) {
        console.error("Failed to fetch parts:", err);
      }
    };
    fetchParts();
  }, []);

  const handleFetchTree = async () => {
    try {
      const data = await buildDependencyTree(selectedPart, recipeType, targetQuantity);
      setTreeData(data);
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
      <Box>
        <Select
          value={selectedPart}
          onChange={(e) => setSelectedPart(e.target.value)}
          displayEmpty
          sx={{ marginRight: 2, minWidth: 200 }}
        >
          <MenuItem value="" disabled>
            Select a Part
          </MenuItem>
          {parts.map((part) => (
            <MenuItem key={part.id} value={part.id}>
              {part.name}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={recipeType}
          onChange={(e) => setRecipeType(e.target.value)}
          displayEmpty
          sx={{ marginRight: 2, minWidth: 200 }}
        >
          <MenuItem value="_Standard">Standard Recipe</MenuItem>
          <MenuItem value="_Alternate">Alternate Recipe</MenuItem>
        </Select>
        <input
          type="number"
          placeholder="Target Quantity"
          value={targetQuantity}
          onChange={(e) => setTargetQuantity(e.target.value)}
          style={{ marginRight: "16px" }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleFetchTree}
          disabled={!selectedPart}
        >
          Fetch Dependency Tree
        </Button>
      </Box>
      {error && <Typography color="error">{error}</Typography>}
      <Box sx={{ marginTop: 4 }}>
        {treeData ? (
          renderTree(treeData)
        ) : (
          <Typography>No data to display</Typography>
        )}
      </Box>
    </div>
  );
};

export default DependencyTreePage;
