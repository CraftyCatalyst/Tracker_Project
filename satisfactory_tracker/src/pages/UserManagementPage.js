import React, { useEffect, useState } from "react";
import { Box, Typography, Button, Alert, Tab, Checkbox } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { DataGrid } from "@mui/x-data-grid";
import { useTheme } from '@mui/material/styles';
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";

const UserManagementPage = () => {
  const theme = useTheme();
  const [testers, setTesters] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [pwResetEmailContent, setPwResetEmailContent] = useState("");
  const [activeTab, setActiveTab] = useState("1");
 

  useEffect(() => {
    fetchTesters();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.table_name("user"));
      setUsers(response.data);      
    } catch (error) {
      setError("Failed to load tester requests.");
    }
  };

  const fetchTesters = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.tester_requests);
      setTesters(response.data);
    } catch (error) {
      setError("Failed to load tester requests.");
    }
  };

  const handleCheckboxChange = async (id, new_value) => {
    try {
      await axios.post(API_ENDPOINTS.update_must_change_password(id, new_value));
      setUsers(users.map(u => u.id === id ? { ...u, new_value } : u));
    } catch (error) {
      setError("Failed to update user."); 
    }
  };

  const handleResetPassword = async (id) => {
    try {
      console.log("Resetting password for user ID with API_ENDPOINT ", API_ENDPOINTS.reset_password(id));
      const response = await axios.put(API_ENDPOINTS.reset_password(id));
      const newPassword = response.data.temp_password;
      const user = users.find(u => u.id === id);

      // ✅ Generate email content
      const emailText = `
Hello ${user.username},

Your password has been reset. Please use the following credentials to log in:

Email: ${user.email}
Temporary Password: ${newPassword}

For security reasons, you will be required to change your password upon first login.
Login here: dev.satisfactorytracker.com

See you soon!
Catalyst, Creator of Satisfactory Tracker`;
    setPwResetEmailContent(emailText); // Store email text for display
    } catch (error) {
      setError("Failed to reset password.");
    }
  };


  const handleApprove = async (id) => {
    try {
      const response = await axios.post(`${API_ENDPOINTS.tester_approve}/${id}`);
      const tempPassword = response.data.temp_password;
      const tester = testers.find(t => t.id === id);

      // ✅ Generate email content
      const emailText = `
Hello ${tester.username},

Congratulations! You have been approved as a tester for Satisfactory Tracker.

You can now log in to your account using the following credentials:

🔹 Email: ${tester.email}  
🔹 Temporary Password: ${tempPassword}  

For security reasons, you will be required to change your password upon first login.  
Login here: dev.satisfactorytracker.com

Welcome aboard! 🎉
Catalyst, Creator of Satisfactory Tracker`;

      setEmailContent(emailText); // Store email text for display
      setTesters(testers.map(t => t.id === id ? { ...t, is_approved: true, reviewed_at: new Date().toISOString() } : t));
    } catch (error) {
      setError("Failed to approve tester.");
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.post(`${API_ENDPOINTS.tester_reject}/${id}`);
      setTesters(testers.map(t =>
        t.id === id ? { ...t, is_approved: false, reviewed_at: new Date().toISOString() } : t
      ));
    } catch (error) {
      setError("Failed to reject tester.");
    }
  };

  const UserColumns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "username", headerName: "Username", width: 150 },
    { field: "role", headerName: "Role", width: 150 },
    { field: "email", headerName: "Email", width: 200 },
    { field: "password", headerName: "Passowrd", width: 250 },
    { field: "created_at", headerName: "Created At", width: 250 },
    {
      field: "must_change_password", headerName: "Must Change Password", width: 250,
      renderCell: (params) => {
        <Checkbox
          // if must_change_password is 1, then the setting is true, create a variable to store the value
          checked={params.row.must_change_password === 1}
          onChange={() => handleCheckboxChange(params.row.id, params.row.must_change_password)}
        />       
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      renderCell: (params) => (
        <>
          {!params.row.is_approved && !params.row.reviewed_at && (
            <Button variant="contained" color="success" onClick={() => handleResetPassword(params.row.id)} sx={{ marginRight: 1 }}>
              Reset Password
            </Button>
          )}
          
        </>
      ),
    },
  ];


  const testerColumns = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "username", headerName: "Username", width: 150 },
    { field: "email", headerName: "Email", width: 200 },
    { field: "fav_thing", headerName: "Favorite Thing", width: 250 },
    { field: "reason", headerName: "Reason", width: 250 },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (params) => {
        if (params.row.is_approved) return "✅ Approved";
        if (!params.row.is_approved && params.row.reviewed_at) return "❌ Rejected";
        return "⏳ Pending";
      },
    },
    { field: "reviewed_at", headerName: "Reviewed At", width: 150, renderCell: (params) => params.value ? new Date(params.value).toLocaleString() : "Pending" },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      renderCell: (params) => (
        <>
          {!params.row.is_approved && !params.row.reviewed_at && (
            <Button variant="contained" color="success" onClick={() => handleApprove(params.row.id)} sx={{ marginRight: 1 }}>
              Approve
            </Button>
          )}
          {!params.row.reviewed_at && (
            <Button variant="contained" color="error" onClick={() => handleReject(params.row.id)}>
              Reject
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <TabContext value={activeTab}>
      <Box sx={{ padding: theme.spacing(2), width: "100%" }}>
        <Typography variant="h3" gutterBottom>🛠️ User Management</Typography>

        <TabList onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="User Maintenance" value="1" />
          <Tab label="Tester Registrations" value="2" />
        </TabList>

        {/* User Maintenance Tab */}
        <TabPanel value="1">
        <Box sx={{ height: 500, width: "100%" }}>
            <DataGrid rows={users} columns={UserColumns} />
        </Box>
        {pwResetEmailContent && (
            <Box sx={{ marginTop: 2 }}>
              <Typography variant="h6">Generated Email:</Typography>
              <textarea
                value={pwResetEmailContent}
                readOnly
                style={{ width: "100%", height: "150px", padding: "10px", fontSize: "14px" }}
              />
              <Button
                variant="contained"
                color="primary"
                sx={{ marginTop: 1 }}
                onClick={() => navigator.clipboard.writeText(pwResetEmailContent)}
              >
                Copy to Clipboard
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* Tester Registrations Tab */}
        <TabPanel value="2">
          {error && <Alert severity="error">{error}</Alert>}
          <Box sx={{ height: 500, width: "100%" }}>
            <DataGrid rows={testers} columns={testerColumns} pageSize={5} />
          </Box>
          {/* Show email text when a tester is approved */}
          {emailContent && (
            <Box sx={{ marginTop: 2 }}>
              <Typography variant="h6">Generated Email:</Typography>
              <textarea
                value={emailContent}
                readOnly
                style={{ width: "100%", height: "150px", padding: "10px", fontSize: "14px" }}
              />
              <Button
                variant="contained"
                color="primary"
                sx={{ marginTop: 1 }}
                onClick={() => navigator.clipboard.writeText(emailContent)}
              >
                Copy to Clipboard
              </Button>
            </Box>
          )}
        </TabPanel>



      </Box>

    </TabContext>
  );
};

export default UserManagementPage;
