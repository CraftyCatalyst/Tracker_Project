import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#00FFCC', // Standard primary color (Light green)
      contrastText: '#CCFFFF', // Sky blue text color on primary background
    },
    secondary: {
      main: '#0A4B3E', // Standard secondary color (Dark Green)
      contrastText: '#00FFCC', // Light green text on dark green background
    },
    background: {
      default: '#000000', // Replacing #0F705C Dark green with #000000 Black for background
      mid: '#008080', // Replaceing #0F705C Dark green with Teal. Background for mid-level components
      paper: '#FFFFFF', // Default white for paper components
    },
    text: {
      primary: '#CCFFFF', // Light text for general use
      secondary: '#66FFCC', // Slightly darker text for secondary use
    },
  },
  typography: {
    fontFamily: 'Arial',
    h1: {
      fontSize: '48px',
      fontWeight: 700,
    },
    h2: {
      fontSize: '16px',
      fontWeight: 600,
    },
    body1: {
      fontSize: '14px',
    },
    body2: {
      fontSize: '12px',
    },
  },
  spacing: 8, // Default spacing multiplier
});

export default theme;
