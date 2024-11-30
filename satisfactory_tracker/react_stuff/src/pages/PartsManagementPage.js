import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PartsManagementPage = () => {
  const [parts, setParts] = useState([]);

  useEffect(() => {
    const fetchParts = async () => {
      const response = await axios.get('/api/parts');
      setParts(response.data);
    };

    fetchParts();
  }, []);

  return (
    <div>
      <h1>Manage Parts</h1>
      <ul>
        {parts.map((part) => (
          <li key={part.id}>{part.part_name}</li>
        ))}
      </ul>
    </div>
  );
};

export default PartsManagementPage;
