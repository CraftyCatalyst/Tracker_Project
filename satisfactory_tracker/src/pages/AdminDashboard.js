import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Select, MenuItem, CircularProgress, Alert, Button, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { DataGrid } from "@mui/x-data-grid";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useTheme } from '@mui/material/styles';
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import StatusCard from "../components/StatusCard";
import EditIcon from '@mui/icons-material/Edit';
import { useAlert } from "../context/AlertContext";


const AdminDashboard = () => {

    const theme = useTheme();
    const { showAlert } = useAlert();
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
    const [systemResources, setSystemResources] = useState(null);
    const [resourceHistory, setResourceHistory] = useState([]);
    const [functionalTestResults, setFunctionalTestResults] = useState({});
    const [loadingFunctionalTests, setLoadingFunctionalTests] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [settings, setSettings] = useState([]);
    const [testerRegistrationMode, setTesterRegistrationMode] = useState(false);
    const [testUpdatesCount, setTestUpdatesCount] = useState(0); // Force re-renders
    const resultsRef = useRef({}); // Store test results outside React state
    const [tests, setTests] = useState([]);
    const [newTest, setNewTest] = useState({ category: "system_test_pages", key: "", value: "" });
    const [selectionModel, setSelectionModel] = useState([]);



    useEffect(() => {
        fetchMaintenanceMode();
        fetchTesterRegistrationMode();
        // fetchSettings();
        fetchTests();
    }, []);

    useEffect(() => {
        if (logModalOpen && logContainerRef.current) {
            logContainerRef.current.scrollBottom = logContainerRef.current.scrollHeight;
        }
    }, [logModalOpen, logContent]);

    useEffect(() => {
        const fetchResources = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.system_resources);
                setSystemResources(response.data);

                // Add new data point to history
                setResourceHistory((prev) => [
                    ...prev.slice(-10), // Keep only the last 10 entries
                    {
                        timestamp: new Date().toLocaleTimeString(),
                        cpu: parseFloat(response.data.cpu_usage),
                        memory: parseFloat((response.data.memory.used / response.data.memory.total) * 100).toFixed(1), // Convert to percentage
                        disk: parseFloat((response.data.disk.used.replace("G", "") / response.data.disk.total.replace("G", "")) * 100).toFixed(1) // Convert to percentage
                    }
                ]);
            } catch (error) {
                console.error("Error fetching system resources:", error);
            }
        };

        fetchResources();
        const interval = setInterval(fetchResources, 5000);
        return () => clearInterval(interval);
    }, []);


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
        const interval = setInterval(fetchActiveUsers, 60000); // Refresh every 60s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchSystemStatus = async () => {
            try {
                const response = await axios.get(API_ENDPOINTS.system_status);
                console.log("System Status API Response:", response.data); // ✅ Debugging
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

    const renderEditableCell = (params) => (
        <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
            <span style={{ flexGrow: 1 }}>{params.value}</span>
            <EditIcon
                fontSize="small"
                sx={{
                    marginLeft: 1,
                    color: "#888",
                    opacity: 0,
                    transition: "opacity 0.2s",
                    "&:hover": { color: "#42a5f5" },
                    ".MuiDataGrid-row:hover &": {
                        opacity: 1
                    }
                }}
            />
        </Box>
    );
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
            showAlert("error", "Failed to fetch logs for " + serviceName);
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
            showAlert("success", response.data.message);
        } catch (error) {
            console.error("Failed to restart service:", error);
            showAlert("error", `Failed to restart ${serviceName}`);
        }
    };

    const runFunctionalTests = async () => {
        setLoadingFunctionalTests(true);
        setFunctionalTestResults({});

        try {
            // ✅ Fetch all test cases
            const response = await axios.get(API_ENDPOINTS.system_test_list);
            const testCases = response.data;
            const totalTests = Object.keys(testCases).length;
            let completedTests = 0;

            for (const testId in testCases) {
                const test = testCases[testId];

                try {
                    const testResponse = await axios.get(`${API_ENDPOINTS.run_system_test}?test_id=${testId}`);

                    // ✅ Track completed tests & update state
                    completedTests++;
                    setFunctionalTestResults((prev) => ({
                        [test.name]: {
                            status: testResponse.data[test.name] || "Error",
                            category: test.type,
                            progress: `${completedTests}/${totalTests}`,
                        },
                        ...prev,
                    }));
                } catch (error) {
                    completedTests++;
                    setFunctionalTestResults((prev) => ({
                        [test.name]: {
                            status: "Error",
                            category: test.type,
                            progress: `${completedTests}/${totalTests}`,
                        },
                        ...prev,
                    }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch test cases:", error);
        }

        setLoadingFunctionalTests(false);
    };


    useEffect(() => {
        console.log("Functional test results updated:", functionalTestResults);
    }, [functionalTestResults]);


    const fetchMaintenanceMode = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.maintenance_mode);
            setMaintenanceMode(response.data.maintenance_mode === "on");
        } catch (error) {
            console.error("Error fetching maintenance mode:", error);
        }
    };

    const fetchTesterRegistrationMode = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.tester_registration_mode);
            setTesterRegistrationMode(response.data.registration_button === "on");
        } catch (error) {
            console.error("Error fetching tester registration mode:", error);
        }
    };

    const toggleMaintenanceMode = async () => {
        try {
            const newMode = !maintenanceMode;
            await axios.post(API_ENDPOINTS.maintenance_mode, { enabled: newMode });
            setMaintenanceMode(newMode);
            fetchMaintenanceMode();
            // window.location.reload();
        } catch (error) {
            console.error("Error toggling maintenance mode:", error);
        }
    };

    const toggleTesterRegistrationMode = async () => {
        try {
            const newMode = !testerRegistrationMode;
            await axios.post(API_ENDPOINTS.tester_registration_mode, { enabled: newMode });
            setTesterRegistrationMode(newMode);
            fetchTesterRegistrationMode();
        } catch (error) {
            console.error("Error fetching tester registration mode:", error);
        }
    };


    const fetchSettings = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.admin_settings);
            setSettings(response.data);
        } catch (error) {
            console.error("Error fetching admin settings:", error);
        }
    };

    const handleEditCellChange = async (updatedRow) => {
        const { id, value } = updatedRow;

        // Update locally for instant UI feedback
        setSettings((prev) =>
            prev.map((row) => (row.id === id ? { ...row, value } : row))
        );

        // Send update request to backend
        try {
            await axios.patch(API_ENDPOINTS.admin_settings, { id, value });
            fetchSettings();
        } catch (error) {
            console.error("Error updating setting:", error);
        }
        return { ...updatedRow, value };
    };

    const settings_columns = [
        { field: "category", headerName: "Category", width: 200 },
        { field: "key", headerName: "Setting Key", width: 250 },
        {
            field: "value",
            headerName: "Setting Value",
            width: 200,
            editable: true,
            renderEditCell:
                (params) => {
                    const isBoolean = ["on", "off"].includes(params.value);
                    return isBoolean ? (
                        <Select
                            value={params.value}
                            onChange={(e) => {
                                const newValue = e.target.value;

                                // ✅ Update the cell value
                                params.api.setEditCellValue({ id: params.id, field: "value", value: newValue });

                                // ✅ Update state and backend
                                handleEditCellChange({ id: params.id, value: newValue });

                                // ✅ Stop edit mode to prevent text selection issues
                                params.api.stopCellEditMode({ id: params.id, field: "value" });
                            }}
                            fullWidth
                        >
                            <MenuItem value="on">on</MenuItem>
                            <MenuItem value="off">off</MenuItem>
                        </Select>
                    ) : (
                        <input
                            type="text"
                            value={params.value}
                            onChange={(e) =>
                                handleEditCellChange({ id: params.id, value: e.target.value })
                            }
                            onBlur={() => params.api.stopCellEditMode({ id: params.id, field: "value" })} // ✅ Stop edit mode when clicking away
                            style={{ width: "100%", border: "none", outline: "none", padding: "8px" }}
                        />
                    );
                }
        },
    ];

    const fetchTests = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.system_tests);
            setTests(response.data);
            console.log("System Tests:", response.data); // ✅ Debugging
        } catch (error) {
            console.error("Error fetching system tests:", error);
        }
    };

    const st_handleEditCellChange = async (params) => {
        const { id, field, value } = params;

        // Update locally for instant UI feedback
        setTests((prev) =>
            prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
        );

        // Send update request to backend
        try {
            await axios.patch(`${API_ENDPOINTS.system_tests}/${id}`, { [field]: value });
        } catch (error) {
            console.error("Error updating test case:", error);
        }
    };

    const handleAddTest = async () => {
        if (!newTest.key || !newTest.value) return;

        try {
            const response = await axios.post(API_ENDPOINTS.system_tests, newTest);
            setTests((prev) => [...prev, { id: response.data.id, ...newTest }]);
            setNewTest({ category: "system_test_pages", key: "", value: "" });
            showAlert("success", "Test case added successfully!");
            fetchTests();
        } catch (error) {
            console.error("Error adding test case:", error);
        }
    };

    const handleDeleteTest = async (id) => {
        try {
            await axios.delete(`${API_ENDPOINTS.system_tests}/${id}`);
            setTests((prev) => prev.filter((test) => test.id !== id));
        } catch (error) {
            console.error("Error deleting test case:", error);
        }
    };
    
    const handleDeleteSelected = async () => {
        try {
          await Promise.all(
            selectionModel.map((id) =>
              axios.delete(`${API_ENDPOINTS.system_tests}/${id}`)
            )
          );
          showAlert("success", "Selected tests deleted successfully!");
          // Refresh the table
          fetchTests();
          setSelectionModel([]);
        } catch (error) {
          console.error("Error deleting selected tests:", error);
          showAlert("error", "Failed to delete one or more selected tests.");
        }
      };
      
    const handleRunTest = async (row) => {
        try {
            const response = await axios.get(`${API_ENDPOINTS.run_system_test}?test_id=${row}`);
            const result = response.data[0];
            console.log(`✅ Test "${row}" result:`, result);
            showAlert("success", `Test "${row}" ran successfully: ${result}`);
        } catch (error) {
            console.error(`❌ Error running test "${row}"`, error);
            showAlert("error", `Error running test "${row}"`, error);
        }
    };

    const system_test_columns = [
        { field: "category", headerName: "Category", width: 200},
        { field: "key", headerName: "Test Key", width: 250, editable: true, renderCell: renderEditableCell },
        { field: "value", headerName: "Endpoint", width: 300, editable: true, renderCell: renderEditableCell },
        {
            field: "actions",
            headerName: "Actions",
            width: 200,
            renderCell: (row) => (
                <Button sx={{minWidth: 175}} variant="contained" size="small" color="primary" onClick={() => handleRunTest(row.id)}>Run</Button>
            ),
        },
    ];


    return (
        <TabContext value={activeTab}>
            <Box sx={{ padding: theme.spacing(2), width: "100%" }}>
                <Typography variant="h3" gutterBottom>🛠️ Admin Dashboard</Typography>

                <TabList onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="System Status" value="1" />
                    <Tab label="Run System Tests" value="2" />
                    <Tab label="Manage System Tests" value="5" />
                    <Tab label="Active Users" value="3" />
                    <Tab label="Server Logs & Controls" value="4" />
                    {/* <Tab label="Settings" value="5" /> */}
                    {/* {systemStatus.run_mode === 'prod' && <Tab label="Logs & Resources" value="4" />} */}

                </TabList>

                {/* System Status Tab */}
                <TabPanel value="1">
                    <Box sx={{ padding: theme.spacing(2), mt: 2, width: "100%", border: "2px solid #ccc", borderRadius: theme.spacing(1) }}>
                        <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Site Settings - No pressy!</Typography>
                        <Button sx={{ mr: 2 }}
                            variant="contained"
                            color={maintenanceMode ? "error" : "warning"}
                            onClick={toggleMaintenanceMode}
                        >
                            {maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
                        </Button>
                        <Button sx={{ mr: 2 }}
                            variant="contained"
                            color={testerRegistrationMode ? "error" : "warning"}
                            onClick={toggleTesterRegistrationMode}
                        >
                            {testerRegistrationMode ? "Disable Tester Registration" : "Enable Tester Registration"}
                        </Button>
                    </Box>
                    <Box sx={{ padding: theme.spacing(2), mt: 2, width: "100%", border: "2px solid #ccc", borderRadius: theme.spacing(1) }}>
                        <Typography variant="h6" sx={{ mt: 2 }}>🔧 System Settings & Status</Typography>
                        {systemStatus ? (
                            <Box sx={{ display: "grid", alignItems: "left", gap: 2, mt: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                                <StatusCard title="RUN_MODE" value={systemStatus.run_mode} />
                                <StatusCard title="Flask Port" value={systemStatus.flask_port} />
                                <StatusCard title="Database" value={systemStatus.db_status} />
                                <StatusCard title="Nginx" value={systemStatus.nginx_status} />
                            </Box>
                        ) : (
                            <CircularProgress />
                        )}


                        {/* 🖥️ System Resource Monitoring (Displays under System Status) */}
                        <Typography variant="h6" sx={{ mt: 2 }}>🖥️ System Resource Monitoring</Typography>

                        {systemResources ? (
                            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", mt: 2 }}>
                                <StatusCard
                                    title="CPU Usage"
                                    value={`${systemResources.cpu_usage}%`} // ✅ Display % symbol
                                    percentage={parseFloat(systemResources.cpu_usage)} // ✅ Extracts % from string
                                />
                                <StatusCard
                                    title="Memory Usage"
                                    value={`${systemResources.memory.used}MB / ${systemResources.memory.total}MB`}
                                    percentage={(parseFloat(systemResources.memory.used) / parseFloat(systemResources.memory.total)) * 100}
                                />
                                <StatusCard
                                    title="Disk Usage"
                                    value={`${systemResources.disk.used} / ${systemResources.disk.total}`}
                                    percentage={(parseFloat(systemResources.disk.used) / parseFloat(systemResources.disk.total)) * 100}
                                />
                            </Box>
                        ) : (
                            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", mt: 2 }}>
                                <StatusCard title="CPU Usage" value="Unable to retrieve system resources" />
                                <StatusCard title="Memory Usage" value="Unable to retrieve system resources" />
                                <StatusCard title="Disk Usage" value="Unable to retrieve system resources" />
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ padding: theme.spacing(2), mt: 2, width: "100%", border: "2px solid #ccc", borderRadius: theme.spacing(1) }}>
                        <Typography variant="h6" sx={{ mt: 2 }}>System Usage Over Time</Typography>

                        <Box sx={{ display: "flex", gap: 1, justifyContent: "space-between", flexWrap: "wrap" }}>
                            {/* CPU Usage Graph */}
                            <Box sx={{ width: "33%", minWidth: 300 }}>
                                <Typography variant="subtitle1">CPU Usage (%)</Typography>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={resourceHistory}>
                                        <XAxis dataKey="timestamp" />
                                        <YAxis domain={[0, 100]} /> {/* ✅ Scales to 0-100% */}
                                        <Tooltip />
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <Line type="monotone" dataKey="cpu" stroke="red" name="CPU Usage" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>

                            {/* Memory Usage Graph */}
                            <Box sx={{ width: "33%", minWidth: 300 }}>
                                <Typography variant="subtitle1">Memory Usage (%)</Typography>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={resourceHistory}>
                                        <XAxis dataKey="timestamp" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <Line type="monotone" dataKey="memory" stroke="blue" name="Memory Usage" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                            {/* Disk Usage Graph */}
                            <Box sx={{ width: "33%", minWidth: 300 }}>
                                <Typography variant="subtitle1">Disk Usage (%)</Typography>
                                <ResponsiveContainer width="100%" height={200}>
                                    <LineChart data={resourceHistory}>
                                        <XAxis dataKey="timestamp" />
                                        <YAxis domain={[0, 100]} /> {/* ✅ Scales to 0-100% */}
                                        <Tooltip />
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <Line type="monotone" dataKey="disk" stroke="green" name="Disk Usage" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </Box>
                    </Box>
                </TabPanel>

                {/* Run Tests Tab */}
                <TabPanel value="2">
                    <Typography variant="h6" sx={{ mt: 2 }}>System Tests</Typography>
                    <Typography variant="body3" sx={{ mt: 1, color: "orange" }}>
                        This takes a while to run. Please be patient and do not refresh your browser.
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                        <Button variant="contained" onClick={() => runFunctionalTests()} disabled={loadingFunctionalTests}>
                            {!loadingFunctionalTests ? "Run Tests" : <CircularProgress size={20} />}
                        </Button>
                    </Box>

                    {/* Display Functional Test Results */}
                    {Object.keys(functionalTestResults).length > 0 && (
                        <Box sx={{ mt: 3, height: 350, overflowY: "auto", border: "1px solid #ccc", borderRadius: 2, padding: 2 }}>
                            <Typography variant="h6">🔍 Test Results</Typography>
                            {Object.entries(functionalTestResults).map(([key, value]) => (
                                <Typography key={key} color={value.status === "Pass" ? "green" : value.status.includes("Fail") ? "red" : "grey"}>
                                    {value.progress} - {value.category} - {key}: {value.status === "Loading" ? <CircularProgress size={15} /> : value.status}
                                </Typography>
                            ))}
                        </Box>
                    )}


                    {functionalTestResults.apis && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6">🔍 API Tests</Typography>
                            {Object.entries(functionalTestResults.apis).map(([key, value]) => (
                                <Typography key={key} color={value === "Pass" ? "green" : value.includes("Fail") ? "red" : "grey"}>
                                    {key}: {value === "Loading" ? <CircularProgress size={15} /> : value}
                                </Typography>
                            ))}
                        </Box>
                    )}

                </TabPanel>

                {/* Manage System Tests Tab */}
                <TabPanel value="5">
                    <Box sx={{ padding: 2 }}>
                        <Typography variant="h5" sx={{ marginBottom: 4 }}>
                            🛠 System Tests Management
                        </Typography>

                        {/* New Test Form */}
                        <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
                            <Select sx={{ minWidth: 175 }}
                                value={newTest.category}
                                size="small"
                                onChange={(e) => setNewTest({ ...newTest, category: e.target.value })}
                            >
                                <MenuItem value="system_test_pages">Page Test</MenuItem>
                                <MenuItem value="system_test_APIs">API Test</MenuItem>
                            </Select>
                            <TextField label="Test Key" value={newTest.key} size="small" onChange={(e) => setNewTest({ ...newTest, key: e.target.value })} />
                            <TextField label="Endpoint" value={newTest.value} size="small" onChange={(e) => setNewTest({ ...newTest, value: e.target.value })} />
                            <Button sx={{minWidth: 175}}
                                variant="contained" color="primary" onClick={handleAddTest}>
                                Add
                            </Button>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", marginBottom: theme.spacing(1), gap: theme.spacing(2) }}>
                            <Typography
                                variant="body3"
                                sx={{ color: "#4FC3F7", mt: 4 }}
                            >
                                * <strong>Editing:</strong> Double-click on the <strong>Test Key</strong> or <strong>Endpoint</strong> fields to edit. Press <strong>Enter</strong> to save. Press <strong>Esc</strong> to cancel. <br />
                                * <strong>Deleting:</strong> Use the <strong>checkboxes</strong> to select rows for deletion then click on the <strong>Delete Selected</strong> button.
                            </Typography>
                        </Box>
                        <Button
                            variant="contained" color="error" disabled={selectionModel.length === 0} onClick={handleDeleteSelected}>
                            Delete Selected
                        </Button>
                        {/* Tests Table */}
                        <div style={{ flexGrow: 1, overflow: "auto", height: "80vh", width: "100%" }}>
                            <DataGrid
                                // density="standard"
                                // rowHeight={40} 
                                rows={tests}
                                columns={system_test_columns}
                                pageSize={15}
                                height={100}
                                processRowUpdate={st_handleEditCellChange}
                                checkboxSelection
                                onRowSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
                                experimentalFeatures={{ newEditingApi: true }}
                                disableSelectionOnClick
                            />
                        </div>
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
                    <Box sx={{ padding: theme.spacing(2), mt: 2, width: "100%", border: "2px solid #ccc", borderRadius: theme.spacing(1) }}>
                        <Typography variant="h6">Logs</Typography>

                        {/* Logs Section */}
                        <Box sx={{ mt: 2 }}>
                            <Button variant="contained" sx={{ mr: 1 }} onClick={() => fetchLogs('nginx')}>
                                View Nginx Logs
                            </Button>
                            <Button variant="contained" sx={{ mr: 1 }} onClick={() => fetchLogs('flask-app')}>
                                View Flask-App Logs
                            </Button>
                            <Button variant="contained" sx={{ mr: 1 }} onClick={() => fetchLogs('flask-dev')}>
                                View Flask-Dev Logs
                            </Button>
                            <Button variant="outlined" onClick={() => fetchLogs('mysql')}>
                                View MySQL Logs
                            </Button>
                        </Box>
                    </Box>

                    {/* Service Controls */}
                    <Box sx={{ padding: theme.spacing(2), mt: 2, width: "100%", border: "2px solid #ccc", borderRadius: theme.spacing(1) }}>
                        <Box sx={{ mt: 2 }}>

                            <Typography variant="h6" sx={{ mt: 2 }}>Service Controls - NO PRESSY!</Typography>
                            <Button variant="contained" sx={{ mt: 1, mr: 1 }} color="warning" onClick={() => restartService('nginx')}>
                                Restart Nginx
                            </Button>
                            <Button variant="contained" sx={{ mt: 1, mr: 1 }} color="warning" onClick={() => restartService('mysql')}>
                                Restart MySQL
                            </Button>
                            <Button variant="contained" sx={{ mt: 1, mr: 1 }} color="warning" onClick={() => restartService('flask-app')}>
                                Restart Flask App
                            </Button>
                            <Button variant="contained" sx={{ mt: 1, mr: 1 }} color="warning" onClick={() => restartService('flask-dev')}>
                                Restart Flask Dev
                            </Button>
                        </Box>
                    </Box>
                    {/* Modal to display logs (moved outside of button boxes for clarity) */}
                    <Dialog
                        open={logModalOpen}
                        onClose={() => setLogModalOpen(false)}
                        fullWidth
                        maxWidth={false} // ✅ Allow custom width
                        maxheight={false} // ✅ Allow custom height
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

                <TabPanel value="5">
                    <Box sx={{ padding: theme.spacing(2), mt: 2, width: "100%", border: "2px solid #ccc", borderRadius: theme.spacing(1) }}>
                        <Typography variant="h6">Admin Settings</Typography>
                        <Box sx={{ flexGrow: 1 }}>
                            <div style={{ flexGrow: 1, overflow: "auto", maxHeight: "50vh", width: "100%" }}>
                                <DataGrid
                                    rows={settings}
                                    columns={settings_columns}
                                    pageSize={25}
                                    processRowUpdate={handleEditCellChange}
                                    experimentalFeatures={{ newEditingApi: true }}
                                    disableSelectionOnClick

                                />
                            </div>
                        </Box>
                    </Box>
                </TabPanel>
                {/* )} */}
            </Box>
        </TabContext>
    )
};

export default AdminDashboard;
