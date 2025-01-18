/// This is the main component of the application. It is responsible for routing the user to the correct page based on the URL path.
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DataManagementPage from './pages/DataManagementPage';
import DependencyTreePage from "./pages/DependencyTreePage";
import SignupPage from './pages/SignupPage';
import Header from './Header';
import { UserProvider } from './UserContext';
import TrackerPage from './pages/TrackerPage';
import ProtectedRoute from './components/ProtectedRoute.js';


function App() {
  return (
    <UserProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Provides default styling reset */}
        <Router>
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />} /> 
            <Route path="/data" element={<DataManagementPage />} />
            <Route path="/dependencies" element={<DependencyTreePage />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </UserProvider>
  );
}


export default App;