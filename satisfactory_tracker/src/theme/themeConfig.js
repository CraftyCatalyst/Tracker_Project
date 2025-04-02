import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { dark } from '@mui/material/styles/createPalette';
import logToBackend from "../services/logService";
import { DensitySmall, WrapText } from '@mui/icons-material';
import { borderLeft, borderRight, fontSize, minHeight, typography, width } from '@mui/system';

export const USE_THEME = 'dark'; // 'light' or 'dark'

export const THEME_LIGHT = {
    // Primary color palette
    primary_main: '#FFFFFF', // #FFFFFF
    primary_secondary: '#191924', // Dark Gray #1E1E2E
    primary_contrastText: '#FFFFFF', // White text on primary background #FFFFFF
    // Secondary color palette
    secondary_main: '#0A3D62', // Deep Ocean Blue #0A3D62
    secondary_contrastText: '#FFFFFF', // White text on secondary background #FFFFFF
    // Background color palette
    background_default: '#FFFFFF', // Light background #FFFFFF
    background_mid: '#F0F0F0', // Light gray background #F0F0F0
    background_paper: '#FFFFFF', // White paper color #FFFFFF
    background_dropdown: '#1E1E1E', // Dark Gray for dropdowns #1E1E1E
    background_tabs: '#1E1E1E', // Dark Gray for tabs #1E1E1E
    // Text color palette
    text_primary: '#FFFFFF', // White text for general use #FFFFFF
    text_secondary: '#A6A6A6', // Light Gray for secondary text #A6A6A6
    text_disabled: '#757575', // Muted Gray for disabled text #757575
    text_dropdown: '#FFFFFF', // White text for dropdowns 
    // Button color palette
    button_main: '#0A3D62', // Dark Gray #242424 change to Deep Ocean Blue #0A3D62
    button_contrastText: '#FFFFFF', // White text on buttons #FFFFFF
    button_hover: '#003b6f', // Dark Charcoal hover color #333333 changed to Tardis Blue #003b6f
    button_disabled: '#383838', // Dark Gray for disabled buttons #383838
    button_disabledText: '#A6A6A6', // Light Gray for disabled text #A6A6A6 
    // Other controls
    progressIndicator_main: '#8A2BE2', // Vibrant Purple #8A2BE2
    menu_divider: '#FFFFFF', // White divider color #FFFFFF
    tooltip_background: '#FFFFFF', // White tooltip background #FFFFFF
    // Typography
    typography_fontFamily: 'Arial, sans-serif',
    typography_h1: { fontSize: '48px', fontWeight: 700 },
    typography_h2: { fontSize: '32px', fontWeight: 600 },
    typography_h3: { fontSize: '20px', fontWeight: 600 },
    typography_body1: { fontSize: '18px' },
    typography_body2: { fontSize: '16px' },
    typography_body3: { fontSize: '14px' },
    typography_body4: { fontSize: '12px' },

    // Spacing
    spacing: 4, // Default spacing unit

    border_tabs: "2px solid #FFFFFF", // White border for selected tab


    // Components
    components_MuiCssBaseline_select: {
        padding: "4px",
        borderRadius: "8px",
        border: "1px solid '#757575'", // Using the disabled text color #757575
        backgroundColor: "#000000", // Black background #000000
        color: "#FFFFFF", // White text color #FFFFFF
        "&:focus": {
            borderColor: '#333333', // Dark Charcoal focus color #333333
            outline: "none",
        },
    },
    components_MuiCssBaseline_body: {
        background: `linear-gradient(to right, #242424, #1E1E2E)`,
        color: '#FFFFFF',
        a: {
            color: '#8A2BE2', // Blue Violet #8A2BE2
            textDecoration: 'none',
            '&:hover': {
                textDecoration: 'underline',
            },
        },
    },

    components_MuiTable_root: {
        backgroundColor: "#242424", // Default background for the whole table #242424
        color: "#FFFFFF", // Default text color #FFFFFF
    },
    components_MuiTableHead_root: {
        position: "sticky", //  Makes the header stick
        top: 0, //  Keeps it at the top when scrolling
        zIndex: 2, //  Ensures it stays above other rows
        backgroundColor: "#1E1E2E", //  Ensures background color remains visible #1E1E2E
    },
    components_MuiTableRow_root: {
        height: "15px", //  Sets row height
        "&:nth-of-type(even)": {
            backgroundColor: "#2C2C3C", //  Alternating row color #3e596c
        },
        "&:hover": {
            backgroundColor: "#393939", //  Hover effect color #393939
        },
    },

    components_MuiTableCell_root: {
        padding: "1px 4px", //  Controls cell padding (affects row height)
        color: "#FFFFFF",
        borderBottom: "1px solid #1E1E2E",
        fontSize: "14px", //  Sets a default font size for table cells
        fontFamily: "Arial, sans-serif", //  Ensure font consistency
    },

    components_MuiTableCell_head: {
        fontWeight: "bold",
        textTransform: "uppercase",
        backgroundColor: '#1E1E2E', //  Header background color #3a3e61
        color: "#FFFFFF",
        padding: "14px 16px", //  Increase header row height
        fontSize: "16px", //  Larger font size for headers
        position: "sticky", //  Ensures column headers remain visible
        top: 0, //  Keeps it at the top
        zIndex: 3, //  Higher than rows to prevent overlap
    },

    components_MuiDataGrid_defaultProps: {
        rowHeight: 40,
        pageSize: 25,
        pageSizeOptions: [10, 25, 100, { value: -1, label: 'All' }],
        checkboxSelection: true,
        disableSelectionOnClick: true,
        sortingOrder: ['asc', 'desc'],
        slots: {
            toolbar: GridToolbar,
        },
        slotProps: {
            toolbar: { showQuickFilter: true },
        },
    },
    components_MuiDataGrid_root: {
        backgroundColor: "#242424", //  Darker Gray background color #242424
        borderRadius: "8px",
        color: "#FFFFFF", // White text color #FFFFFF
        border: `1px solid #1E1E2E`, //  Border color #C4C4C4
    },
    components_MuiDataGrid_columnHeaders: {
        backgroundColor: "#1E1E2E", //  Header background color #264431
        color: "#FFFFFF",   // White text color #FFFFFF
        fontSize: "16px",
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    components_MuiDataGrid_row: {
        "&:nth-of-type(even)": {
            backgroundColor: '#2C2C3C', //  Alternating row color #3e596c
        },
        "&:hover": {
            backgroundColor: '#393939', //  Hover effect color #8A2BE2
        },
    },
    components_MuiDataGrid_cell: {
        borderColor: "#1E1E2E !important", //  Purple cell borders #8A2BE2
    },

    components_MuiDataGrid_columnSeparator: {
        color: "#1E1E2E !important", //  Purple column separator color #8A2BE2
    },
    components_MuiDataGridfooter_Container: {
        backgroundColor: "#1E1E2E", //  Footer background color #264431
        color: "#FFFFFF", // White text color #FFFFFF
    },
    components_MuiDataGrid_toolbar: {
        backgroundColor: "#1E1E2E", //  Toolbar background color #264431
        color: "#FFFFFF", // White text color #FFFFFF
    },

    components_MuiButton_root: {
        borderRadius: 8,
        textTransform: 'none',
    },
    components_MuiButton_containedPrimary: {
        backgroundColor: '#0A3D62', // #242424 changed to #0A3D62
        color: '#FFFFFF', // White text color #FFFFFF
        '&:hover': {
            backgroundColor: '#333333', // #1d3a2a
        },
    },
    components_MuiButton_containedSecondary: {
        backgroundColor: '#0A3D62', // #242424 changed to #0A3D62
        color: '#FFFFFF', // White text color #FFFFFF
        '&:hover': {
            backgroundColor: '#333333', // #1d3a2a
        },
    },
    components_MuiButton_outlinedPrimary: {
        backgroundColor: '#0A3D62', // #242424 changed to #0A3D62
        color: '#FFFFFF', // White text color #FFFFFF
        '&:hover': {
            backgroundColor: '#333333', // #2a2e51
        },
    },
    components_MuiButton_outlinedSecondary: {
        backgroundColor: '#0A3D62', // #242424 changed to #0A3D62
        color: '#FFFFFF', // White text color #FFFFFF
        '&:hover': {
            backgroundColor: '#333333', // #1d3a2a
        },
    },

    components_MuiTextField_root: {
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: '#8A2BE2', // Blue Violet border color #8A2BE2
            },
            '&:hover fieldset': {
                borderColor: '#DDA0DD', // Plum border color #DDA0DD
            },
            '&.Mui-focused fieldset': {
                borderColor: '#FFFFFF',   // White border color #FFFFFF
            },
        },
    },
    components_MuiTextField_input: {
        color: '#FFFFFF', // White text color #FFFFFF
    },


    components_Dropzone_root: {
        border: '2px dashed #8A2BE2', // Blue Violet border #8A2BE2
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: '#242424', // Dark Gray background #242424
        transition: 'background-color 0.3s ease-in-out',
        color: '#FFFFFF', // White text color   #FFFFFF
        borderRadius: "8px",
        width: "100%",
        maxWidth: 800,
        minHeight: 120,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
    },
    components_Dropzone_active: {
        backgroundColor: '#6F1E96', // #6F1E96
        borderColor: '#DDA0DD', // Plum border color #DDA0DD
    },
    trackerPageStyles: {
        tabsContainer: {
            borderBottom: 1,
            borderColor: "#FFFFFF", // White border color
            backgroundColor: "#1E1E1E", // Dark Gray background
            borderRadius: "8px",
            padding: "2px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center", // Ensures proper alignment
            height: "30px", // Set explicit height
            minHeight: "30px", // Ensures it doesn't shrink
            maxHeight: "50px", // Optional: Prevents excessive growth
        },
        tabList: {
            "& .MuiTab-root": {
                fontSize: "0.85rem",
                minWidth: "80px",
                fontWeight: "bold",
                border: "2px solid transparent",
                borderRadius: "8px",
                padding: "8px 16px", // Reduce padding to shrink tab size
                margin: "4px",
                minHeight: "30px", // Match height of container
                transition: "0.3s",
                color: "#FFFFFF",
            },
            "& .MuiTabs-root": {
                minHeight: "30px"
            },
            "& .MuiTabs-indicator": {
                height: "1px",
            },
        },

        tabPanelBox: {
            display: "flex",
            justifyContent: "space-between",
            gap: 4,
            width: "100%",
        },
        chartBox: {
            width: "50%",
            minWidth: 600,
            mt: 4,
        },
        reportBox: {
            width: "100%",
            minWidth: 600,
            mt: 4,
        },
        trackerBox: {
            border: "2px solid #ddd",
            borderRadius: "8px",
            padding: "16px",
            backgroundColor: "#1E1E1E", // Dark Gray background #1E1E1E
            width: "100%",
        },
    },
};

export const THEME_DARK = {
    // Primary color palette
    primary_main: '#FFFFFF', // Deep Purple-Blue #1E1E2E 
    primary_secondary: '#191924', // Dark Gray #1E1E2E
    primary_contrastText: '#FFFFFF', // White text on primary background #FFFFFF
    // Secondary color palette
    secondary_main: '#0A3D62', // Deep Ocean Blue #0A3D62
    secondary_contrastText: '#FFFFFF', // White text on secondary background #FFFFFF
    // Background color palette
    background_default: '#121212', // Deep Black-Gray #121212
    background_mid: '#1A1A2E', // Dark Navy Blue #1A1A2E
    background_paper: '#242424', // Darker Gray #242424
    background_dropdown: '#1E1E1E', // Dark Gray for dropdowns #1E1E1E
    background_tabs: '#1E1E1E', // Dark Gray for tabs #1E1E1E
    // Text color palette
    text_primary: '#FFFFFF', // White text for general use #FFFFFF
    text_secondary: '#A6A6A6', // Light Gray for secondary text #A6A6A6
    text_disabled: '#757575', // Muted Gray for disabled text #757575
    text_dropdown: '#FFFFFF', // White text for dropdowns 
    text_dark: '#000000', // Black text for white backgrounds #000000
    text_info: '#4FC3F7', // Light Blue #4FC3F7
    // Button color palette
    button_main: '#0A3D62', //'#242424', // Dark Gray #242424 changed to Deep Ocean Blue #0A3D62
    button_contrastText: '#FFFFFF', // White text on buttons #FFFFFF
    button_hover: '#003b6f', // Dark Charcoal hover color #333333 changed to Tardis Blue #003b6f
    button_disabled: '#383838', // Dark Gray for disabled buttons #383838
    button_disabledText: '#A6A6A6', // Light Gray for disabled text #A6A6A6 
    // Progress indicator color palette
    progressIndicator_main: '#8A2BE2', // Vibrant Purple #8A2BE2

    // Graphs
    graph_background: '#262626', // #262626

    // Spacing
    spacing: 4, // Default spacing unit

    border_tabs: "2px solid #FFFFFF", // White border for selected tab


    // Components
    components_MuiCssBaseline_select: {
        padding: "4px",
        borderRadius: "8px",
        border: "1px solid '#757575'", // Using the disabled text color #757575
        backgroundColor: "#000000",
        color: "#FFFFFF",
        "&:focus": {
            borderColor: '#333333', // Dark Charcoal focus color #333333
            outline: "none",
        },
    },
    components_MuiCssBaseline_body: {
        background: `linear-gradient(to right, #242424, #1E1E2E)`,
        color: '#FFFFFF',
        a: {
            color: '#8A2BE2', // Blue Violet #8A2BE2
            textDecoration: 'none',
            '&:hover': {
                textDecoration: 'underline',
            },
        },
    },

    components_MuiTable_root: {
        backgroundColor: "#242424", // Default background for the whole table #242424
        color: "#FFFFFF", // Default text color #FFFFFF
    },
    components_MuiTableHead_root: {
        position: "sticky", //  Makes the header stick
        top: 0, //  Keeps it at the top when scrolling
        zIndex: 2, //  Ensures it stays above other rows
        backgroundColor: "#1E1E2E", //  Ensures background color remains visible #1E1E2E
    },
    components_MuiTableRow_root: {
        height: "15px", //  Sets row height
        "&:nth-of-type(even)": {
            backgroundColor: "#2C2C3C", //  Alternating row color #3e596c
        },
        "&:hover": {
            backgroundColor: "#393939", //  Hover effect color #393939
        },
    },

    components_MuiTableCell_root: {
        padding: "1px 4px", //  Controls cell padding (affects row height)
        color: "#FFFFFF",
        borderBottom: "1px solid #1E1E2E",
        fontSize: "12px !important", //  Sets a default font size for table cells
        fontFamily: "Arial, sans-serif", //  Ensure font consistency
    },

    components_MuiTableCell_head: {
        fontWeight: "bold",
        textTransform: "uppercase",
        backgroundColor: '#1E1E2E', //  Header background color #3a3e61
        color: "#FFFFFF",
        padding: "14px 16px", //  Increase header row height
        fontSize: "14px", //  Larger font size for headers
        position: "sticky", //  Ensures column headers remain visible
        top: 0, //  Keeps it at the top
        zIndex: 3, //  Higher than rows to prevent overlap
    },

    components_MuiDataGrid_defaultProps: {
        density: "compact",
        // rowHeight: 40,
        pageSize: 100,
        pageSizeOptions: [10, 25, 100, { value: -1, label: 'All' }],
        checkboxSelection: true,
        disableSelectionOnClick: true,
        sortingOrder: ['asc', 'desc'],
        slots: {
            toolbar: GridToolbar,
        },
        slotProps: {
            toolbar: { showQuickFilter: true },
        },
    },
    components_MuiDataGrid_root: {
        backgroundColor: "#242424", //  Darker Gray background color #242424
        borderRadius: "8px",
        color: "#FFFFFF",
        border: `1px solid #1E1E2E`, //  Border color #1E1E2E
    },
    components_MuiDataGrid_columnHeaders: {
        backgroundColor: "#1E1E2E", //  Header background color #1E1E2E
        color: "#FFFFFF",
        fontSize: "10px",
        fontWeight: "bold",
        position: "sticky",
        top: 0,
        zIndex: 10,
        // textTransform: "uppercase",
        '& .MuiDataGrid-columnHeaderTitle': {
            whiteSpace: "normal",
            lineHeight: "1.2",     // Reduce spacing between lines
            textAlign: "center",
        },
    },
    components_MuiDataGrid_virtualScroller: {
        overflow: "auto",
        maxHeight: "60vh",
    },
    components_MuiDataGrid_row: {
        "&:nth-of-type(even)": {
            backgroundColor: '#2C2C3C', //  Alternating row color #2C2C3C
        },
        "&:hover": {
            backgroundColor: '#393939', //  Hover effect color #393939
        },
    },
    components_MuiDataGrid_cell: {
        borderColor: "#1E1E2E !important", //  Cell borders #1E1E2E !important
        fontSize: "12px", //  Sets a default font size for table cells
    },

    components_MuiDataGrid_columnSeparator: {
        color: "#1E1E2E !important", //  Purple column separator color #1E1E2E !important
    },
    components_MuiDataGridfooter_Container: {
        backgroundColor: "#1E1E2E", //  Footer background color #264431
        color: "#FFFFFF",
    },
    components_MuiDataGrid_toolbar: {
        backgroundColor: "#1E1E2E", //  Toolbar background color #264431
        color: "#FFFFFF",
    },
    components_MuiDataGrid_editableCell: {
        backgroundColor: "rgba(66, 165, 245, 0.05)",  // Soft blue overlay
        borderLeft: "2px solid #42a5f5",   // Blue accent
        borderRight: "4px solid #42a5f5",   // Blue accent
        fontWeight: 500,
        color: "#FFFFFF",
        "&:hover": {
            backgroundColor: "#31344a",    // Slightly lighter on hover
        },
    },
    components_MuiButton_defaultProps: {
        variant: 'contained',
        color: 'primary',
        height: 40,
        width: 175,        
    },
    components_MuiButton_root: {
        borderRadius: 8,
        textTransform: 'none',
    },
    components_MuiButton_containedPrimary: {
        backgroundColor: '#0A3D62', // #242424 changed to #0A3D62
        color: '#FFFFFF', // White text color #FFFFFF
        '&:hover': {
            backgroundColor: '#000080', // Dark Charcoal hover color #333333 changed to  #000080
        },
    },
    components_MuiButton_containedSecondary: {
        backgroundColor: '#0A3D62', // #242424 changed to #0A3D62
        color: '#FFFFFF', // White text color #FFFFFF
        '&:hover': {
            backgroundColor: '#000080', // Dark Charcoal hover color #333333 changed to  #000080
        },
    },
    components_MuiButton_outlinedPrimary: {
        backgroundColor: '#0A3D62', // #242424 changed to #0A3D62
        color: '#FFFFFF', // White text color #FFFFFF
        '&:hover': {
            backgroundColor: '#000080', // Dark Charcoal hover color #333333 changed to  #000080
        },
    },
    components_MuiButton_outlinedSecondary: {
        backgroundColor: '#0A3D62', // #242424 changed to #0A3D62
        color: '#FFFFFF', // White text color #FFFFFF
        '&:hover': {
            backgroundColor: '#000080', // Dark Charcoal hover color #333333 changed to  #000080
        },
    },

    components_MuiTextField_root: {
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: '#8A2BE2', // Blue Violet border color #8A2BE2
            },
            '&:hover fieldset': {
                borderColor: '#DDA0DD', // Plum border color #DDA0DD
            },
            '&.Mui-focused fieldset': {
                borderColor: '#FFFFFF',   // White border color #FFFFFF
            },
        },
    },
    components_MuiTextField_input: {
        color: '#FFFFFF', // White text color #FFFFFF
    },


    components_Dropzone_root: {
        border: '2px dashed #8A2BE2', // Blue Violet border #8A2BE2
        padding: '5px',
        textAlign: 'center',
        WrapText: 'wrap',
        cursor: 'pointer',
        backgroundColor: '#242424', // Dark Gray background #242424
        transition: 'background-color 0.3s ease-in-out',
        color: '#FFFFFF', // White text color   #FFFFFF
        borderRadius: "8px",
        width: "100%",
        maxWidth: 500,
        minHeight: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
    },
    components_Dropzone_active: {
        backgroundColor: '#6F1E96', // #6F1E96
        borderColor: '#DDA0DD', // Plum border color #DDA0DD
    },
    trackerPageStyles: {
        tabsContainer: {
            borderBottom: 2,
            borderColor: "#FFFFFF",
            backgroundColor: "#1E1E1E",
            borderRadius: "8px",
            padding: "1px",
            display: "flex",
            justifyContent: "center",
        },
        tabList: {
            "& .MuiTab-root": {
                fontSize: "1rem",
                minWidth: "80px",
                fontWeight: "bold",
                border: "2px solid transparent",
                borderRadius: "8px",
                padding: "8px 16px",
                margin: "4px",
                height: "8px",
                minHeight: "8px",
                transition: "0.3s",
                color: "#FFFFFF",
            },
            "& .MuiTab-root.Mui-selected": {
                borderColor: "#FFFFFF",
                backgroundColor: "rgba(255,255,255,0.1)",
            },
            "& .MuiTab-root:hover": {
                borderColor: "#888888",
            },
        },
        tabPanelBox: {
            display: "flex",
            justifyContent: "space-between",
            gap: 4,
            width: "100%",
        },
        chartBox: {
            width: "50%",
            minWidth: 600,
            mt: 1,
        },
        reportBox: {
            width: "100%",
            minWidth: 600,
            height: 600,
            mt: 1,
        },
        trackerBox: {
            border: "2px solid #ddd",
            borderRadius: "8px",
            padding: "12px",
            backgroundColor: "#1E1E1E",// #1E1E1E
            width: "100%",
        },
        tracker_Drop_Zone_Arrow: {
            color: '#FFFFFF', // White text color #FFFFFF
            textAlign: 'center',
            backgroundColor: '#242424', // Dark Gray background #242424
            borderRadius: "8px",
            width: "20%",
            maxWidth: 400,
            minHeight: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
        },
    },
};

// Common settings for both light and dark themes
export const COMMON_SETTINGS = {

    // Typography
    typography_fontFamily: 'Arial, sans-serif',
    typography_h1: { fontSize: '48px', fontWeight: 700 },
    typography_h1_italic: { fontSize: '48px', fontStyle: 'italic', fontWeight: 700 },
    typography_h1_underline: { fontSize: '48px', textDecoration: 'underline', fontWeight: 600 },
    typography_h2: { fontSize: '32px', fontWeight: 600 },
    typography_h2_italic: { fontSize: '32px', fontStyle: 'italic', fontWeight: 600 },
    typography_h2_underline: { fontSize: '32px', textDecoration: 'underline', fontWeight: 600 },
    typography_h3: { fontSize: '20px', fontWeight: 600 },
    typography_h3_italic: { fontSize: '20px', fontStyle: 'italic', fontWeight: 600 },
    typography_h3_underline: { fontSize: '20px', textDecoration: 'underline', fontWeight: 600 },
    typography_h4: { fontSize: '18px', fontWeight: 600 },
    typography_h4_italic: { fontSize: '18px', fontStyle: 'italic', fontWeight: 600 },
    typography_h4_underline: { fontSize: '18px', textDecoration: 'underline', fontWeight: 600 },
    typography_h5: { fontSize: '16px', fontWeight: 600 },
    typography_h5_italic: { fontSize: '16px', fontStyle: 'italic', fontWeight: 600 },
    typography_h5_underline: { fontSize: '16px', textDecoration: 'underline', fontWeight: 600 },
    typography_h6: { fontSize: '14px', fontWeight: 600 },
    typography_h6_italic: { fontSize: '14px', fontStyle: 'italic', fontWeight: 600 },
    typography_h6_underline: { fontSize: '14px', textDecoration: 'underline', fontWeight: 600 },
    typography_h7: { fontSize: '12px', fontWeight: 600 },
    typography_h7_italic: { fontSize: '12px', fontStyle: 'italic', fontWeight: 600 },
    typography_h7_underline: { fontSize: '12px', textDecoration: 'underline', fontWeight: 600 },
    typography_body1: { fontSize: '18px' },
    typography_body1_italic: { fontSize: '18px', fontStyle: 'italic' },
    typography_body1_underline: { fontSize: '18px', textDecoration: 'underline' },
    typography_body1_underline_bold: { fontSize: '18px', textDecoration: 'underline', fontWeight: 600 },
    typography_body2: { fontSize: '16px' },
    typography_body2_italic: { fontSize: '16px', fontStyle: 'italic' },
    typography_body2_underline: { fontSize: '16px', textDecoration: 'underline' },
    typography_body2_underline_bold: { fontSize: '16px', textDecoration: 'underline', fontWeight: 600 },
    typography_body3: { fontSize: '14px' },
    typography_body3_italic: { fontSize: '14px', fontStyle: 'italic' },
    typography_body3_underline: { fontSize: '14px', textDecoration: 'underline' },
    typography_body3_underline_bold: { fontSize: '14px', textDecoration: 'underline', fontWeight: 600 },
    typography_body4: { fontSize: '12px' },
    typography_body4_italic: { fontSize: '12px', fontStyle: 'italic' },
    typography_body4_underline: { fontSize: '12px', textDecoration: 'underline' },
    typography_body4_underline_bold: { fontSize: '12px', textDecoration: 'underline', fontWeight: 600 },

    // Spacing
    spacing: 4, // Default spacing unit

};
