import React, { useState, useEffect } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { API_ENDPOINTS } from "../../../apiConfig";

const MachineMetadataTable = () => {
  const [metadata, setMetadata] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMachineMetadata = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINTS.machine_metadata);
        setMetadata(response.data || []);
      } catch (err) {
        console.error("Error fetching machine_metadata:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMachineMetadata();
  }, []);

  const columns = [
    { field: "machine_name", headerName: "Machine Name", flex: 1 },
    { field: "produced_item", headerName: "Produced Item", flex: 1 },
    { field: "part_supply_pm", headerName: "Part Supply PM", flex: 1, type: "number" },
    { field: "conveyor_speed", headerName: "Conveyor Speed", flex: 1, type: "number" },
    { field: "output_inventory", headerName: "Output Inventory", flex: 2 },
  ];

  const rows = metadata.map((item, index) => ({
    id: index,
    ...item
  }));

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ display: "flex", width: "100%", minHeight: 400 }}>
      <Typography variant="h6">machine_metadata Results</Typography>
      <DataGrid
        density="compact"
        rows={rows}
        columns={columns}
      />
    </Box>
  );
};

export default MachineMetadataTable;
