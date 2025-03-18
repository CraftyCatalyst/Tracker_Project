// Use this file to compare proposed changes before implementing them
import React, { useEffect, useContext, useState, useRef } from 'react';
import { ReactComponent as DiscordIcon } from '../assets/icons/discord-icon.svg';
import { ReactComponent as GitHubIcon } from '../assets/icons/github-mark-white.svg';
import { Box, Typography, Button, IconButton, Tooltip, Menu, MenuItem, Divider, Tab, Table } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../apiConfig';
import { UserContext } from '../context/UserContext';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import HomeIcon from '@mui/icons-material/Home';
import TableViewIcon from '@mui/icons-material/TableView';
import TuneIcon from '@mui/icons-material/Tune';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import FavoriteIcon from '@mui/icons-material/Favorite'; // Contribute Icon
import ForumIcon from '@mui/icons-material/Forum'; // Discord Alternative
import CodeIcon from '@mui/icons-material/Code';
import StackedLineChartIcon from '@mui/icons-material/StackedLineChart';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { Comment, Discord, AttachMoney, Favorite } from '@mui/icons-material';
import PaidIcon from '@mui/icons-material/Paid';
import { useTheme } from '@mui/material/styles';
import UserSettingsPage from '../pages/UserSettingsPage';
import { useLocation } from "react-router-dom";
import MenuIcon from '@mui/icons-material/Menu';
import { useMediaQuery } from '@mui/material';
import TesterRequestModal from "../pages/TesterRequestModal";
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import GitHubIssueModal from "../pages/GitHubIssueModal.js";
import HelpCenterIcon from '@mui/icons-material/HelpCenter';

axios.defaults.withCredentials = true;

const Header = () => {
    const theme = useTheme();
    const { user, logout } = React.useContext(UserContext); // Access user and logout function
    const navigate = useNavigate();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const location = useLocation();
    const [navAnchorEl, setNavAnchorEl] = useState(null); // For navigation menu
    const [menuAnchorEl, setMenuAnchorEl] = useState(null);
    const bannerRef = useRef(null);
    const handleMenuOpen = (event) => setMenuAnchorEl(event.currentTarget);
    const handleMenuClose = () => setMenuAnchorEl(null);
    const [testerModalOpen, setTesterModalOpen] = useState(false);
    const [issueModalOpen, setIssueModalOpen] = useState(false);


    const pageTitles = {
        "/": "Home",
        "/data": "Data Management",
        "/dependencies": "Part Dependencies",
        "/tracker": "My Tracker",
    };

    // Get the current page title, default to "Satisfactory Tracker" if route not found
    const currentPageTitle = pageTitles[location.pathname] || "Satisfactory Tracker";

    const handleLogout = async () => {
        try {
            logout();
            navigate('/login');
        } catch (error) {
            console.error("Error during logout:", error);
        }
    };

    const handleLogin = () => {
        try {
            navigate('/login'); // Navigate to login page
        } catch (error) {
            console.error("Error during login:", error);
        }
    };

    return (
        <Box sx={{
            position: "sticky",
            top: 0,
            width: "100%",
            zIndex: 1100,
            backgroundColor: theme.palette.primary.secondary,
            boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)"
        }}>
            {/* Top Section: Menu (Left), Banner (Center), User Info (Right) */}
            <Box sx={{
                width: '100%',
                padding: theme.spacing(1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                {/* Left Section: Menu + Report Issue Button */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Box sx={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={handleMenuOpen}>
                        <IconButton color="inherit" sx={{ fontSize: 32 }}>
                            <MenuIcon sx={{ fontSize: 32 }} />
                        </IconButton>
                        <Typography variant="h4" sx={{ color: theme.palette.primary.contrastText }}>Menu</Typography>
                    </Box>

                    {/* ✅ Only show if user is logged in */}
                    {user && (
                        <>
                            <Button variant="contained" color="warning" onClick={() => setIssueModalOpen(true)}>
                                Report An Issue
                            </Button>
                            {issueModalOpen && (  // ✅ Only render when open
                                <GitHubIssueModal open={issueModalOpen} onClose={() => setIssueModalOpen(false)} />
                            )}
                        </>
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        href="https://github.com/CraftyCatalyst/Tracker_Project/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Review All Issues
                    </Button>

                </Box>


                {/* Center Section: Banner */}
                <Box sx={{ display: "flex", justifyContent: "center", flexGrow: 1 }}>
                    <Tooltip title="Satisfactory Tracker - Home">
                        <a href="/">
                            <img src="images/app/Satisfactory_Tracker_Banner.png" alt="Banner"
                                style={{ height: '60px', maxWidth: "100%" }} />
                        </a>
                    </Tooltip>
                </Box>

                {/* Right Section: User Info & Login/Logout */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    {user ? (
                        <Typography variant="h5" align="center">Logged in as:<br />{user.username}</Typography>
                    ) : (
                        <Typography variant="h5">Log In</Typography>
                    )}
                    <Tooltip title={user ? "Logout" : "Login"} arrow>
                        <IconButton color="inherit" onClick={user ? handleLogout : handleLogin}>
                            {user ? <LogoutIcon /> : <LoginIcon />}
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Navigation Menu */}
            <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left"
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "left"
                }}
            >
                {/* Navigation Links */}
                <MenuItem component={Link} to="/" onClick={handleMenuClose}>
                    <HomeIcon sx={{ marginRight: 1 }} /> Home
                </MenuItem>

                {/* Restricted Menu Items - Only visible if logged in */}
                {user && (
                    <>
                        <MenuItem component={Link} to="/dependencies" onClick={handleMenuClose}>
                            <LibraryAddIcon sx={{ marginRight: 1 }} /> Part Dependencies
                        </MenuItem>
                        <MenuItem component={Link} to="/tracker" onClick={handleMenuClose}>
                            <StackedLineChartIcon sx={{ marginRight: 1 }} /> Tracker
                        </MenuItem>


                    </>
                )}
                {/* Only show Data Management and Tester Management if user is an admin */}
                {user?.role === "admin" && (
                    <>
                        <Divider sx={{ borderColor: theme.palette.primary.contrastText, borderWidth: "2px", opacity: 0.7 }} />
                        <MenuItem component={Link} to="/admin/user_management" onClick={handleMenuClose}>
                            <PersonSearchIcon sx={{ marginRight: 1 }} /> User Management
                        </MenuItem>
                        <MenuItem component={Link} to="/data" onClick={handleMenuClose}>
                            <TableViewIcon sx={{ marginRight: 1 }} /> Data Management
                        </MenuItem>                        
                        <MenuItem component={Link} to="/admin/dashboard" onClick={handleMenuClose}>
                            <DashboardIcon sx={{ marginRight: 1 }} /> Admin Dashboard
                        </MenuItem>
                    </>

                )}


                <Divider sx={{ borderColor: theme.palette.primary.contrastText, borderWidth: "2px", opacity: 0.7 }} />
                {/* User Section */}
                {user ? (
                    <>
                        <MenuItem disabled>Logged in as: {user.username}</MenuItem>
                        <Divider />
                        <MenuItem onClick={handleMenuClose} component={Link} to="/settings">
                            <SettingsIcon sx={{ marginRight: 1 }} /> Settings
                        </MenuItem>
                        <MenuItem onClick={handleMenuClose} component={Link} to="/help">
                            <HelpCenterIcon sx={{ marginRight: 1 }} /> Help & Guides
                        </MenuItem>
                        <MenuItem
                            onClick={() => { handleLogout(); handleMenuClose(); }}
                            component={Link}
                            to="/"
                        >
                            <LogoutIcon sx={{ marginRight: 1 }} /> Logout
                        </MenuItem>
                    </>
                ) : (
                    <MenuItem
                        onClick={() => { handleLogin(); handleMenuClose(); }}
                    >
                        <LoginIcon sx={{ marginRight: 1 }} /> Login
                    </MenuItem>
                )}

                <Divider sx={{ borderColor: theme.palette.primary.contrastText, borderWidth: "2px", opacity: 0.7 }} />

                {/* Restricted Menu Items - Only visible if logged in */}
                {user && (
                    <>
                        {/* Contribute Section */}
                        <MenuItem disabled><Favorite sx={{ marginRight: 1, color: "#4FC3F7" }} /> <b>Help make the site better</b></MenuItem>
                        <Divider />
                        <MenuItem component="a" href="https://your-discord-link.com" target="_blank">
                            <DiscordIcon style={{ width: 24, height: 24, marginRight: 8 }} />
                            Join Discord - Coming soon
                        </MenuItem>
                        <MenuItem component="a" href="https://github.com/your-repo" target="_blank">
                            <GitHubIcon style={{ width: 24, height: 24, marginRight: 8 }} />
                            GitHub Repository
                        </MenuItem>
                        <MenuItem component="a" href="https://your-feedback-form.com" target="_blank">
                            <Comment sx={{ marginRight: 1 }} /> Leave a Comment - Coming soon
                        </MenuItem>

                        <Divider sx={{ borderColor: theme.palette.primary.contrastText, borderWidth: "2px", opacity: 0.7 }} />

                        {/* Support Section */}
                        <MenuItem disabled><Favorite sx={{ marginRight: 1, color: "#4FC3F7" }} /> <b>Help keep the site running</b></MenuItem>
                        <Divider />
                        <MenuItem component="a" href="https://paypal.me/your-link" target="_blank">
                            <AttachMoney sx={{ marginRight: 1 }} /> Donate through PayPal - Coming soon
                        </MenuItem>
                        <MenuItem component="a" href="https://patreon.com/your-link" target="_blank">
                            <PaidIcon sx={{ marginRight: 1 }} /> Pledge on Patreon - Coming soon
                        </MenuItem>
                    </>
                )}
            </Menu>
        </Box>
    );
};

export default Header;
