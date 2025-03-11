/// This is the main component of the application. It is responsible for routing the user to the correct page based on the URL path.
import React, { useEffect } from 'react';
import { AlertProvider } from "./context/AlertContext";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
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
import TesterManagementPage from './pages/TesterManagementPage.js';
import ChangePasswordPage from './pages/ChangePasswordPage.js';
import HelpPage from './pages/HelpPage.js';
import { Box } from "@mui/material"; // Import Box



function App() {
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

  
  return (
    <UserProvider>
      <AlertProvider> {/* Wrap AlertProvider around the app */}
        <ThemeProvider theme={theme}>
          <CssBaseline /> {/* Provides default styling reset */}
          <Router>
            {/* 🔹 Wrap the entire app inside a flex container */}
            <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
              <Header />

              {/* 🔹 This ensures content expands & pushes the footer down */}
              <Box sx={{ flex: "1 0 auto", display: "flex", flexDirection: "column" }}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<ProtectedRoute />} />
                  <Route path="/data" element={<DataManagementPage />} />
                  <Route path="/dependencies" element={<DependencyTreePage />} />
                  <Route path="/tracker" element={<TrackerPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/settings" element={<UserSettings />} />
                  <Route path="/admin/testers" element={<TesterManagementPage />} />
                  <Route path="/change-password" element={<ChangePasswordPage />} />
                  <Route path="/help" element={<HelpPage />} />
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