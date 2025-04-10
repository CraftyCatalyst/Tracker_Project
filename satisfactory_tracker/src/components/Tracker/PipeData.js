import { API_ENDPOINTS } from "../../apiConfig";
import React, { useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { Box, Typography } from "@mui/material";
import centralLogging from "../../services/logService";
import { useTheme } from "@mui/material/styles";

const PipeData = () => {
    const [pipeData, setPipeData] = useState([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();

    useEffect(() => {
        const fetchPipeData = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.user_pipe_data);
                setPipeData(response.data.links || []);
            } catch (error) {
                console.error("Error fetching pipe data:", error);
            } finally {
                setLoading(false);
            }
        };
        // centralLogging("********************************FRONTEND PIPE DATA********************************", "DEBUG");
        // centralLogging("PipeData Response: " + pipeData, "INFO");
        // centralLogging("********************************END OF FRONTEND PIPE DATA********************************", "DEBUG");
        fetchPipeData();
    }, []);

    const columns = [
        { field: "id", headerName: "ID", flex: 0.5 },
        { field: "pipe_network", headerName: "Pipe Network", flex: 1 },
        { field: "source_component", headerName: "Source", flex: 1 },
        { field: "source_level", headerName: "Source Level", flex: 1 },
        { field: "source_reference_id", headerName: "Source ID", flex: 1 },
        { field: "target_component", headerName: "Target", flex: 1 },
        { field: "target_level", headerName: "Target Level", flex: 1 },
        { field: "target_reference_id", headerName: "Target ID", flex: 1 },
        { field: "produced_item", headerName: "Fluid Type", flex: 1 },
        { field: "pipe_flow_rate", headerName: "Flow Rate (m³/min)", flex: 1, type: "number" },
        { field: "created_at", headerName: "Created At", flex: 1 },
    ];

    return (
        <Box sx={theme.trackerPageStyles.reportBox}>
            <Typography variant="h5" gutterBottom>
                Pipe Network Data
            </Typography>
            <DataGrid density="compact" 
                rows={pipeData.map((row, index) => ({ ...row, id: `link-${index}` }))}
                columns={columns} 
                loading={loading}
            />
        </Box>
    );
};

export default PipeData;
