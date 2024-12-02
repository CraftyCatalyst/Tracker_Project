import React from 'react';
import { Grid2, Paper, Typography } from '@mui/material';

const SampleGrid = () => {
  return (
    <Grid2 container spacing={2}>
      {[1, 2, 3, 4, 5].map((item) => (
        <Grid2 item xs={12} sm={6} md={4} key={item}>
          <Paper style={{ padding: '20px', textAlign: 'center' }}>
            <Typography variant="h6">Item {item}</Typography>
          </Paper>
        </Grid2>
      ))}
    </Grid2>
  );
};

export default SampleGrid;