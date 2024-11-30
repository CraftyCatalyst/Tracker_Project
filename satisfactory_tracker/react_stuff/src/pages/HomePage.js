import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => (
  <div>
    <h1>Welcome to the Satisfactory Tracker</h1>
    <nav>
      <Link to="/login">Login</Link> | <Link to="/data">Manage Data</Link>
    </nav>
  </div>
);

export default HomePage;
