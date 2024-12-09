import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme'; // Import your theme file
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DataManagementPage from './pages/DataManagementPage';
import DependencyTreePage from "./pages/DependencyTreePage";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Provides default styling reset */}
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/data" element={<DataManagementPage />} />
          <Route path="/dependencies" element={<DependencyTreePage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}


export default App;