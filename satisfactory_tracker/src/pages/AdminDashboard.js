import React, { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent, CircularProgress, Alert } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";

const AdminDashboard = () => {
    const [systemStatus, setSystemStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeUsers, setActiveUsers] = useState([]);

    useEffect(() => {
        const fetchActiveUsers = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.active_users);

                const usersArray = Object.entries(response.data).map(([id, user]) => ({
                    id, // Use user ID as DataGrid row ID
                    username: user.username,
                    page: user.page,
                    last_active: user.last_active
                }));
                setActiveUsers(usersArray);
            } catch (error) {
                console.error("Error fetching active users:", error);
            }
        };

        fetchActiveUsers();
        const interval = setInterval(fetchActiveUsers, 5000); // Refresh every 5s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchSystemStatus = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.system_status);
                setSystemStatus(response.data);
            } catch (error) {
                console.error("Error fetching system status:", error);
                setError("Failed to load system status. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchSystemStatus();
    }, []);

    const columns = [
        { field: "username", headerName: "Username", flex: 1 },
        { field: "page", headerName: "Current Page", flex: 1 },
        { field: "last_active", headerName: "Last Active", flex: 1 }
    ];

    return (
        <Box sx={{ padding: 4 }}>
            <Typography variant="h4" gutterBottom>
                🛠 Admin Dashboard
            </Typography>

            {loading ? (
                <CircularProgress />
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : systemStatus ? (
                <Box sx={{ display: "grid", gap: 2, maxWidth: 600 }}>
                    <StatusCard title="RUN_MODE" value={systemStatus.run_mode || "Unknown"} />
                    <StatusCard title="Flask Port" value={systemStatus.flask_port || "Unknown"} />
                    <StatusCard title="Database Status" value={systemStatus.db_status || "Unknown"} />
                    <StatusCard title="Nginx Status" value={systemStatus.nginx_status || "Unknown"} />
                </Box>
            ) : (
                <Typography variant="body1">No system status available.</Typography>
            )}
            <Box sx={{ padding: 4 }}>
                <Typography variant="h4" gutterBottom>
                    🛠 Admin Dashboard
                </Typography>

                <Typography variant="h5" sx={{ marginTop: 3 }}>
                    👥 Active Users
                </Typography>

                {loading ? (
                    <CircularProgress />
                ) : (
                    <Box sx={{ height: 400, marginTop: 2 }}>
                        <DataGrid
                            rows={activeUsers}
                            columns={columns}
                            pageSize={10}
                            disableSelectionOnClick
                        />
                    </Box>
                )}
            </Box>
        </Box>

    );
};

const StatusCard = ({ title, value }) => (
    <Card sx={{ backgroundColor: "secondary.main" }}>
        <CardContent>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body1">{value}</Typography>
        </CardContent>
    </Card>
);

export default AdminDashboard;
