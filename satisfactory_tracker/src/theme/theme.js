import { createTheme } from '@mui/material/styles';



const theme = createTheme({
  palette: {
    primary: {
      main: '#00FFCC', // Standard primary color (Light green) #00FFCC. Test colours red #FF0000, blue #0000FF, or yellow #FFFF00, light blue #b2d8d8 
      contrastText: '#CCFFFF', // Sky blue #CCFFFF text color on primary background
    },
    secondary: {
      main: '#004c4c', // Standard secondary color (Dark Green). Replaced #0A4B3E with #004c4c
      contrastText: '#00FFCC', // Light green text on dark green background. Replaced #00FFCC with #66b2b2
    },
    background: {
      default: '#000000', // Replacing #0F705C Dark green with #000000 Black for background
      mid: '#008080', // Replaceing #0F705C Dark green with Teal. Background for mid-level components
      paper: '#000000', // Default white for paper components
    },
    text: {
      primary: '#CCFFFF', // Light text for general use #CCFFFF
      secondary: '#66b2b2', // Slightly darker text for secondary use Replaced #66FFCC with #66b2b2
      disabled: '#C4C4C4', // Disabled text color.
    },
  },
  typography: {
    fontFamily: 'Arial',
    h1: {
      fontSize: '48px',
      fontWeight: 700,
    },
    h2: {
      fontSize: '32px',
      fontWeight: 600,
    },
    h3: {
      fontSize: '20px',
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

  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          textTransform: 'uppercase',
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          color: '#00FFCC',
          backgroundcolor: '#004c4c',
        },
      },
    },
  },
});

export default theme;
