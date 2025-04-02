import { createTheme } from '@mui/material/styles';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import logToBackend from "../services/logService";
import { dark } from '@mui/material/styles/createPalette';
import { USE_THEME, THEME_LIGHT, THEME_DARK, COMMON_SETTINGS } from './themeConfig';
import { useTheme } from '@emotion/react';

let scheme = {};

// get theme from .env file
// const envUseTheme = process.env.REACT_APP_USE_THEME;
// logToBackend("theme.js - Theme from .env file: " + envUseTheme, "INFO");

switch (USE_THEME) {
  case 'dark':
    scheme = THEME_DARK;
    break;
  case 'light':
    scheme = THEME_LIGHT;
    break;
  default:
    scheme = THEME_LIGHT;
    break;
}


const theme = createTheme({
  palette: {
    primary: {
      main: scheme.primary_main,
      secondary: scheme.primary_secondary,
      contrastText: scheme.primary_contrastText
    },
    secondary: {
      main: scheme.secondary_main,
      contrastText: scheme.secondary_contrastText
    },
    background: {
      default: scheme.background_default,
      mid: scheme.background_mid,
      paper: scheme.background_paper,
      dropdown: scheme.background_dropdown,
      tabs: scheme.background_tabs
    },
    border: {
      tabs: scheme.border_tabs
    },
    text: {
      primary: scheme.text_primary,
      secondary: scheme.text_secondary,
      disabled: scheme.text_disabled,
      dropdown: scheme.text_dropdown,
      dark: scheme.text_dark,
      info: scheme.text_info,
    },
    button: {
      main: scheme.button_main,
      contrastText: scheme.button_contrastText,
      hover: scheme.button_hover,
      disabled: scheme.button_disabled,
      disabledText: scheme.button_disabledText
    },
    progressIndicator: {
      main: scheme.progressIndicator_main,
    },
    graphs: {
      background: scheme.graphs_background,
    },
    menu_divider: {
      colour: scheme.menu_divider,
    },
    tooltip77: {
      background: scheme.tooltip_background,
    },

},

  typography: {
    fontFamily: COMMON_SETTINGS.typography_fontFamily,
    h1: COMMON_SETTINGS.typography_h1,
    h1_italic: COMMON_SETTINGS.typography_h1_italic,
    h1_underline: COMMON_SETTINGS.typography_h1_underline,
    h2: COMMON_SETTINGS.typography_h2,
    h2_italic: COMMON_SETTINGS.typography_h2_italic,
    h2_underline: COMMON_SETTINGS.typography_h2_underline,
    h3: COMMON_SETTINGS.typography_h3,
    h3_italic: COMMON_SETTINGS.typography_h3_italic,
    h3_underline: COMMON_SETTINGS.typography_h3_underline,
    h4: COMMON_SETTINGS.typography_h4,
    h4_italic: COMMON_SETTINGS.typography_h4_italic,
    h4_underline: COMMON_SETTINGS.typography_h4_underline,
    h5: COMMON_SETTINGS.typography_h5,
    h5_italic: COMMON_SETTINGS.typography_h5_italic,
    h5_underline: COMMON_SETTINGS.typography_h5_underline,
    h6: COMMON_SETTINGS.typography_h6,
    h6_italic: COMMON_SETTINGS.typography_h6_italic,
    h6_underline: COMMON_SETTINGS.typography_h6_underline,
    body1: COMMON_SETTINGS.typography_body1,
    body1_italic: COMMON_SETTINGS.typography_body1_italic,
    body1_underline: COMMON_SETTINGS.typography_body1_underline,
    body1_underline_bold: COMMON_SETTINGS.typography_body1_underline_bold,
    body2: COMMON_SETTINGS.typography_body2,
    body2_italic: COMMON_SETTINGS.typography_body2_italic,
    body2_underline: COMMON_SETTINGS.typography_body2_underline,
    body2_underline_bold: COMMON_SETTINGS.typography_body2_underline_bold,
    body3: COMMON_SETTINGS.typography_body3,
    body3_italic: COMMON_SETTINGS.typography_body3_italic,
    body3_underline: COMMON_SETTINGS.typography_body3_underline,
    body3_underline_bold: COMMON_SETTINGS.typography_body3_underline_bold,
    body4: COMMON_SETTINGS.typography_body4,
    body4_italic: COMMON_SETTINGS.typography_body4_italic,
    body4_underline: COMMON_SETTINGS.typography_body4_underline,
    body4_underline_bold: COMMON_SETTINGS.typography_body4_underline_bold,
  },

  spacing: COMMON_SETTINGS.spacing,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        select: scheme.components_MuiCssBaseline_select,
        body: scheme.components_MuiCssBaseline_body,
      },
    },

    MuiTable: {
      styleOverrides: {
        root: scheme.components_MuiTable_root,
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: scheme.components_MuiTableHead_root,
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: scheme.components_MuiTableRow_root,
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: scheme.components_MuiTableCell_root,
        head: scheme.components_MuiTableCell_head
      },
    },

    MuiDataGrid: {
      styleOverrides: {
        root: scheme.components_MuiDataGrid_root,
        columnHeaders: scheme.components_MuiDataGrid_columnHeaders,
        row: scheme.components_MuiDataGrid_row,
        cell: {
          ...scheme.components_MuiDataGrid_cell,
          "&.MuiDataGrid-cell--editable": {
            ...scheme.components_MuiDataGrid_editableCell,
          },
        },
        columnSeparator: scheme.components_MuiDataGrid_columnSeparator,
        footerContainer: scheme.components_MuiDataGridfooter_Container,
        toolbarContainer: scheme.components_MuiDataGrid_toolbar,
      },
      defaultProps: scheme.components_MuiDataGrid_defaultProps,
    },
    MuiButton: {
      styleOverrides: {
        root: scheme.components_MuiButton_root,
        containedPrimary: scheme.components_MuiButton_containedPrimary,
        containedSecondary: scheme.components_MuiButton_containedSecondary,
        outlinedPrimary: scheme.components_MuiButton_outlinedPrimary,
        outlinedSecondary: scheme.components_MuiButton_outlinedSecondary,
      },
      defaultProps: scheme.components_MuiButton_defaultProps,
    },
    MuiTextField: {
      styleOverrides: {
        root: scheme.components_MuiTextField_root,
      },
    },

    components_MuiTabList_root: {
      styleOverrides: {
        root: scheme.components_MuiTabList_root,
      },
    },

    Dropzone: {
      styleOverrides: {
        root: scheme.components_Dropzone_root,
        active: scheme.components_Dropzone_active,
      },
    },

    DropZoneArrow: {
      styleOverrides: {
        root: scheme.components_Drop_Zone_Arrow_Box,
      },
    },
  },
  trackerPageStyles: scheme.trackerPageStyles,
  // trackerPageSettings: scheme.trackerPageSettings // Uncommented for future use

});


export default theme;

