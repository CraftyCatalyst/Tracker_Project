import React, { useState, useEffect } from "react";
import { Box, Typography, Button, IconButton, FormControlLabel, Checkbox, Modal, Grid2 } from "@mui/material";
import { SketchPicker } from "react-color";
import axios from "axios";
import { API_ENDPOINTS } from "../apiConfig";
import { useTheme } from "@mui/material/styles";
import { THEME_LIGHT, THEME_DARK } from "../theme/themeConfig";
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { useAlert } from "../context/AlertContext";
import centralLogging from '../services/logService';

const UserSettingsPage = ({ open, onClose }) => {
    const theme = useTheme();
    const { showAlert } = useAlert();
    const [settings, setSettings] = useState({});
    const [updatedSettings, setUpdatedSettings] = useState({});
    const [themeSelection, setThemeSelection] = useState("light");
    const [showPicker, setShowPicker] = useState({});
    const [hasCustomChanges, setHasCustomChanges] = useState(false);

    useEffect(() => {
        if (open) {
            const fetchSettings = async () => {
                try {
                    const response = await axios.get(API_ENDPOINTS.user_settings);
                    const settingsMap = response.data.reduce((acc, setting) => {
                        acc[setting.key] = setting.value;
                        return acc;
                    }, {});
                    setSettings(settingsMap);
                    setUpdatedSettings(settingsMap);
                    setThemeSelection(settingsMap.active_theme || "light");
                } catch (error) {
                    console.error("Error fetching user settings:", error);
                }
            };
            fetchSettings();
        }
    }, [open]);

    const handleThemeChange = async (event) => {
        const selectedTheme = event.target.value;
        setThemeSelection(selectedTheme);

        try {
            await axios.post(API_ENDPOINTS.user_settings, {
                category: "Active Theme",
                key: "active_theme",
                value: selectedTheme,
            });
        } catch (error) {
            console.error("Error saving active theme setting:", error);
        }
    };

    const selectedThemeConfig = themeSelection === "dark" ? THEME_DARK : THEME_LIGHT;

    const handleColorChange = (key, color) => {
        setUpdatedSettings({ ...updatedSettings, [key]: color.hex });
        setHasCustomChanges(true);
    };

    const togglePicker = (key) => {
        setShowPicker({ ...showPicker, [key]: !showPicker[key] });
    };

    const handleTypographyChange = (key, field, value) => {
        setUpdatedSettings({
            ...updatedSettings,
            [key]: { ...updatedSettings[key], [field]: value }
        });
        setHasCustomChanges(true);
    };

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setUpdatedSettings({ ...updatedSettings, [name]: value });
        setHasCustomChanges(true);
    };

    const saveSettings = async () => {
        try {
            for (const [key, value] of Object.entries(updatedSettings)) {
                await axios.post(API_ENDPOINTS.user_settings, {
                    category: "Theme",
                    key,
                    value: JSON.stringify(value),
                });
            }
            if (hasCustomChanges) {
                await axios.post(API_ENDPOINTS.user_settings, {
                    category: "Active Theme",
                    key: "active_theme",
                    value: "custom",
                });
                setThemeSelection("custom");
            }
            showAlert("success", "Settings saved successfully!");
            onClose();
        } catch (error) {
            console.error("Error saving settings:", error);
            showAlert("error", "Failed to save settings.");
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "20%",
                maxHeight: "80vh",
                overflowY: "auto",
                bgcolor: "background.paper",
                p: 4,
                borderRadius: 2,
                boxShadow: 24
            }}>
                <Typography variant="h2" gutterBottom>
                    User Settings
                </Typography>
                <Typography variant="h3" gutterBottom>
                    Theme Settings
                </Typography>
                <Box sx={{ display: "flex", gap: 2, marginBottom: 4 }}>
                    <FormControlLabel control={<Checkbox checked={themeSelection === "light"} onChange={handleThemeChange} value="light" />} label="Light" />
                    <FormControlLabel control={<Checkbox checked={themeSelection === "dark"} onChange={handleThemeChange} value="dark" />} label="Dark" />
                    <FormControlLabel control={<Checkbox checked={themeSelection === "custom"} onChange={handleThemeChange} value="custom" />} label="Custom" />
                </Box>
                <Grid2 container spacing={2}>
                    {Object.keys(selectedThemeConfig).map((key) => (
                        <Grid2 item xs={12} sm={6} key={key} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Typography sx={{ width: "150px" }}>{key.replace(/_/g, " ")}</Typography>
                            {typeof selectedThemeConfig[key] === "string" && selectedThemeConfig[key].startsWith("#") ? (
                                <>
                                    <Box sx={{ width: 24, height: 24, backgroundColor: updatedSettings[key] || selectedThemeConfig[key], border: "1px solid #000" }} />
                                    <input
                                        type="text"
                                        name={key}
                                        value={updatedSettings[key] || selectedThemeConfig[key]}
                                        onChange={handleInputChange}
                                        style={{ width: "100px", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }}
                                    />
                                    <IconButton onClick={() => togglePicker(key)}>
                                        <MoreHorizIcon />
                                    </IconButton>
                                    {showPicker[key] && (
                                        <SketchPicker
                                            color={updatedSettings[key] || selectedThemeConfig[key]}
                                            onChange={(color) => handleColorChange(key, color)}
                                        />
                                    )}
                                </>
                            ) : typeof selectedThemeConfig[key] === "object" ? (
                                Object.keys(selectedThemeConfig[key]).map((subKey) => (
                                    <input
                                        type="text"
                                        name={subKey}
                                        value={updatedSettings[key]?.[subKey] || selectedThemeConfig[key][subKey]}
                                        onChange={(e) => handleTypographyChange(key, subKey, e.target.value)}
                                        fullWidth
                                        style={{ width: "100px", padding: "5px", border: "1px solid #ccc", borderRadius: "4px" }}
                                    />
                                ))
                            ) : null}
                        </Grid2>
                    ))}
                </Grid2>
                <Box
                    sx={{
                        width: "100%",
                        padding: "16px",
                        backgroundColor: theme.palette.primary.secondary,
                        color: "primary.contrastText",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "left",
                        textAlign: "center",
                        marginTop: "auto", // Pushes footer to bottom
                    }}
                >
                    <Button variant="outlined" onClick={saveSettings} sx={{ marginTop: 4 }}>
                        Save Settings
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
};

export default UserSettingsPage;

