/// This is the main component of the application. It is responsible for routing the user to the correct page based on the URL path.
import React, { useEffect, useState } from 'react';
import { AlertProvider } from "./context/AlertContext";
import { UserContext } from './context/UserContext';
import { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useLocation } from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import ReactDOM from "react-dom";
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DataManagementPage from './pages/DataManagementPage';
import DependencyTreePage from "./pages/DependencyTreePage";
import SignupPage from './pages/SignupPage';
import Header from './components/Header';
import Footer from './components/Footer.js';
import { UserProvider } from './context/UserContext';
import TrackerPage from './pages/TrackerPage';
import ProtectedRoute from './components/ProtectedRoute.js';
import UserSettings from './pages/UserSettingsPage';
import UserManagementPage from './pages/UserManagementPage.js';
import ChangePasswordPage from './pages/ChangePasswordPage.js';
import HelpPage from './pages/HelpPage.js';
import { Box } from "@mui/material";
import AdminDashboard from './pages/AdminDashboard';
import SupportInbox from './pages/SupportInbox.js';
import ResetPasswordPage from './pages/ResetPasswordPage.js';
import ForgotPasswordPage from './pages/ForgotPasswordPage.js';
import EmailVerificationPage from './pages/EmailVerificationPage';
import axios from "axios";
import { API_ENDPOINTS } from "./apiConfig";



const ActivityTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const updateActivity = async () => {
      try {
        await axios.post(API_ENDPOINTS.user_activity, { page: location.pathname });
      } catch (error) {
        console.error("Failed to update user activity:", error);
      }
    };

    updateActivity();
  }, [location]);

  return null; // No UI, just tracking activity
};




function App() {
  const [isMaintenanceMode, setMaintenanceMode] = useState(false);
  const { user } = useContext(UserContext) || {};


  useEffect(() => {
    // Determine the title based on the domain
    const hostname = window.location.hostname;
    let title = 'Satisfactory Tracker';

    if (hostname === 'localhost') {
      title = 'Satisfactory Tracker - LOCAL';
    } else if (hostname === 'www.satisfactorytracker.com') {
      title = 'Satisfactory Tracker';
    } else if (hostname === 'dev.satisfactorytracker.com') {
      title = 'Satisfactory Tracker - Closed Beta Test';
    }

    // Set the document title
    document.title = title;
  }, []);

  const fetchMaintenanceMode = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.get_admin_setting("site_settings", "maintenance_mode"));
      setMaintenanceMode(response.data.value === "on");
    } catch (error) {
      console.error("Error checking maintenance mode:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMaintenanceMode();
    }
  }, [user]);

  return (
    <UserProvider>
      <AlertProvider> {/* Wrap AlertProvider around the app */}
        <ThemeProvider theme={theme}>
          <CssBaseline /> {/* Provides default styling reset */}
          <Router>
            <ActivityTracker />
            <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              <Header />
              <Box sx={{ flex: "1 0 auto", display: "flex", flexDirection: "column" }}>
                <Routes>
                  <Route path="/" element={<HomePage isMaintenanceMode={isMaintenanceMode} />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/login/reverify" element={<LoginPage />} />

                  {(!isMaintenanceMode || (user && user.role === "admin")) ? (
                    <>
                      <Route path="/data" element={<DataManagementPage />} />
                      <Route path="/dependencies" element={<DependencyTreePage />} />
                      <Route path="/tracker" element={<TrackerPage />} />
                      <Route path="/signup" element={<SignupPage />} />
                      <Route path="/settings" element={<UserSettings />} />
                      <Route path="/change-password" element={<ChangePasswordPage />} />
                      <Route path="/help" element={<HelpPage />} />
                      <Route path="/admin/user_management" element={<UserManagementPage />} />
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/support_inbox" element={<SupportInbox />} />
                      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/verify-email/:token" element={<EmailVerificationPage />} />


                    </>
                  ) : (
                    /* ✅ Redirect non-admins back to home */
                    <Route path="*" element={<Navigate to="/" replace />} />
                  )}
                </Routes>
              </Box>
              <Footer />
            </Box>
          </Router>
        </ThemeProvider>
      </AlertProvider>
    </UserProvider>
  );
}

export default App;