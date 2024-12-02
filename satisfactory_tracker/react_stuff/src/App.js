// #### Simpliflied version of the App.js file ####
// import React from 'react';
// import { ThemeProvider } from '@mui/material/styles';
// import CssBaseline from '@mui/material/CssBaseline';
// import theme from './theme/theme'; // Ensure this exists
// import DataManagementPage from './pages/DataManagementPage';

// function App() {
//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <DataManagementPage />
//     </ThemeProvider>
//   );
// }
// ################################################

// //#### Original code ####
// import React from 'react';
// import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
// import HomePage from './pages/HomePage';
// import LoginPage from './pages/LoginPage';
// import DataManagementPage from './pages/DataManagementPage';

// function App() {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<HomePage />} />
//         <Route path="/login" element={<LoginPage />} />
//         <Route path="/data" element={<DataManagementPage />} />
//       </Routes>
//     </Router>
//   );
// }
// ################################################

// #### Simple example of the theme component ####
// import React from 'react';
// import { ThemeProvider } from '@mui/material/styles';
// import CssBaseline from '@mui/material/CssBaseline';
// import { createTheme } from '@mui/material/styles';

// const theme = createTheme();

// function App() {
//   return (
//     <ThemeProvider theme={theme}>
//       <CssBaseline />
//       <div>Hello World</div>
//     </ThemeProvider>
//   );
// }
// ################################################

// #### Target app ####
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme'; // Import your theme file
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DataManagementPage from './pages/DataManagementPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Provides default styling reset */}
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/data" element={<DataManagementPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
// ################################################

export default App;