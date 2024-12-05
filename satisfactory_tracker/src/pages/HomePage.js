import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Typography, Box } from '@mui/material';

const HomePage = () => (
  <>
    <Box sx={{ backgroundColor: 'background.default', padding: 2 }}>
      <Typography variant="h1" color="primary">
        Welcome to the Satisfactory Tracker
      </Typography>
      <Typography variant="body1" color="text.secondary">
        This page uses the site-wide theme for consistent colors and typography.
      </Typography>
      <Button variant="contained" color="secondary" sx={{ marginTop: 2 }}>
        Don't Click Me!
      </Button>
    </Box>
    <nav>
      <Link to="/login">Login</Link> | <Link to="/data">Manage Data</Link>
    </nav>
  </>
);

export default HomePage;
