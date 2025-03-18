import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Card, CardContent, CircularProgress, Alert, Button, Tab, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useTheme } from '@mui/material/styles';
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import StatusCard from "../components/StatusCard";


const AdminDashboard = () => {

    const theme = useTheme();
    const logContainerRef = useRef(null);
    const [activeTab, setActiveTab] = useState("1");
    const [systemStatus, setSystemStatus] = useState({});
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeUsers, setActiveUsers] = useState([]);
    const [logModalOpen, setLogModalOpen] = useState(false);
    const [logContent, setLogContent] = useState([]);
    const [logLoading, setLogLoading] = useState(false);

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
        const interval = setInterval(fetchActiveUsers, 60000); // Refresh every 5s
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

    useEffect(() => {
        if (logModalOpen && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logModalOpen, logContent]);

    const fetchLogs = async (serviceName) => {
        setLogLoading(true);
        try {
            const response = await axios.get(API_ENDPOINTS.fetch_logs(serviceName));
            console.log("Logs API Response:", response.data); // ✅ Debugging

            const logs = response.data.logs || []; // ✅ Extract the logs array

            setLogContent(logs);
            setLogModalOpen(true);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
            alert("Failed to fetch logs for " + serviceName);
            setLogContent(["Unable to fetch logs. Check the server."]);
        } finally {
            setLogLoading(false);
            setLogModalOpen(true);
        }
    };

    const restartService = async (serviceName) => {
        try {
            const response = await axios.post(`${API_ENDPOINTS.restart_service(serviceName)}`);
            console.log("Service restart response:", response.data);
            alert(response.data.message);
        } catch (error) {
            console.error("Failed to restart service:", error);
            alert(`Failed to restart ${serviceName}`);
        }
    };

    const columns = [
        { field: "username", headerName: "Username", flex: 1 },
        { field: "page", headerName: "Current Page", flex: 1 },
        { field: "last_active", headerName: "Last Active", flex: 1 }
    ];

    return (
        <TabContext value={activeTab}>
            <Box sx={{ padding: theme.spacing(2), width: "100%" }}>
                <Typography variant="h3" gutterBottom>🛠️ Admin Dashboard</Typography>

                <TabList onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="System Status" value="1" />
                    <Tab label="Run Tests" value="2" />
                    <Tab label="Active Users" value="3" />
                    <Tab label="Logs & Resources" value="4" />
                    {/* {systemStatus.run_mode === 'prod' && <Tab label="Logs & Resources" value="4" />} */}

                </TabList>

                {/* System Status Tab */}
                <TabPanel value="1">
                    {systemStatus ? (
                        <Box sx={{ display: "grid", alignItems: "left", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                            <StatusCard title="RUN_MODE" value={systemStatus.run_mode} />
                            <StatusCard title="Flask Port" value={systemStatus.flask_port} />
                            <StatusCard title="Database" value={systemStatus.db_status} />
                            <StatusCard title="Nginx" value={systemStatus.nginx_status} />
                        </Box>
                    ) : (
                        <CircularProgress />
                    )}
                </TabPanel>

                {/* Run Tests Tab */}
                <TabPanel value="2">
                    <Typography variant="h5">🔍 Run Tests</Typography>
                    <Box sx={{ marginTop: theme.spacing(2) }}>
                        <Typography variant="h6">Test Pages</Typography>
                        <Button variant="contained" sx={{ mt: 1 }}>Run Page Tests</Button>
                        <Box sx={{ height: 400, mt: 2 }}>
                            <DataGrid columns={[
                                { field: 'page', headerName: 'Page', flex: 1 },
                                { field: 'status', headerName: 'Status', flex: 1 },
                            ]} rows={[]} />
                        </Box>

                        <Typography variant="h6" sx={{ mt: 4 }}>Major Functionality</Typography>
                        <Button variant="contained" sx={{ mt: 1 }}>Run Feature Tests</Button>
                        <Box sx={{ height: 400, mt: 2 }}>
                            <DataGrid columns={[{ field: 'feature', flex: 1 }, { field: 'status', flex: 1 }]} rows={[]} />
                        </Box>
                    </Box>
                </TabPanel>

                {/* Active Users Tab */}
                <TabPanel value="3">
                    <Box sx={{ padding: 4 }}>
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
                </TabPanel>

                {/* {systemStatus.run_mode === 'prod' && ( */}
                {/* Logs & Resources Tab */}
                <TabPanel value="4">
                    <Typography variant="h6">Logs & Resources</Typography>

                    {/* Logs Section */}
                    <Box sx={{ mt: 2 }}>
                        <Button variant="outlined" sx={{ mr: 1 }} onClick={() => fetchLogs('nginx')}>
                            View Nginx Logs
                        </Button>
                        <Button variant="outlined" sx={{ mr: 1 }} onClick={() => fetchLogs('flask-app')}>
                            View Flask-App Logs
                        </Button>
                        <Button variant="outlined" sx={{ mr: 1 }} onClick={() => fetchLogs('flask-dev')}>
                            View Flask-Dev Logs
                        </Button>
                        <Button variant="outlined" onClick={() => fetchLogs('mysql')}>
                            View MySQL Logs
                        </Button>
                    </Box>

                    {/* Service Controls */}
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6">Service Controls</Typography>
                        <Button variant="contained" sx={{ mt: 1, mr: 1 }} onClick={() => restartService('nginx')}>
                            Restart Nginx
                        </Button>
                        <Button variant="contained" sx={{ mr: 1 }} onClick={() => restartService('mysql')}>
                            Restart MySQL
                        </Button>
                        <Button variant="contained" onClick={() => restartService('flask-app')}>
                            Restart Flask App
                        </Button>
                        <Button variant="contained" onClick={() => restartService('flask-dev')}>
                            Restart Flask Dev
                        </Button>
                    </Box>

                    {/* Modal to display logs (moved outside of button boxes for clarity) */}
                    <Dialog
                        open={logModalOpen}
                        onClose={() => setLogModalOpen(false)}
                        fullWidth
                        maxWidth={false} // ✅ Allow custom width
                        maxHeight={false} // ✅ Allow custom height
                        sx={{
                            "& .MuiDialog-paper": {
                                width: "80vw",  // ✅ Increase modal width
                                maxHeight: "75vh", // ✅ Allow more vertical space
                                resize: "both", // ✅ Make modal resizable
                                overflow: "auto",
                            }
                        }}
                    >
                        <DialogTitle>Service Logs</DialogTitle>
                        <DialogContent>
                            <Box
                                ref={logContainerRef}
                                sx={{
                                    maxHeight: "60vh",
                                    overflow: "auto",
                                    fontSize: "0.85rem", 
                                    fontFamily: "monospace",
                                    backgroundColor: "#222", 
                                    color: "#ddd",
                                    padding: "10px",
                                    borderRadius: "5px"
                                }}
                            >
                                {logLoading ? (
                                    <CircularProgress />
                                ) : (
                                    <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                                        {Array.isArray(logContent) && logContent.length > 0
                                            ? logContent.join("\n")
                                            : "No logs available."
                                        }
                                    </pre>
                                )}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setLogModalOpen(false)}>Close</Button>
                        </DialogActions>
                    </Dialog>
                </TabPanel>

                {/* )} */}
            </Box>
        </TabContext>
    )
};

export default AdminDashboard;
