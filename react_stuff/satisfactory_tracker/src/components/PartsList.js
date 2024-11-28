import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';


const PartsList = () => {
  const [parts, setParts] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch parts when the component loads
    const loadParts = async () => {
        try {
            const response = await apiClient.get('/parts'); // Use your Axios instance
            setParts(response.data);
            } catch (err) {
            console.error('Error fetching parts:', err);
            setError('Failed to load parts. Please try again later.');
            }
        };

    loadParts();
  }, []);

  return (
    <div>
      <h2>Parts List</h2>
      {error && <p>{error}</p>}
      {parts.length > 0 ? (
        <ul>
          {parts.map((part) => (
            <li key={part.id}>
              {part.part_name} - {part.category}
            </li>
          ))}
        </ul>
      ) : (
        <p>No parts available.</p>
      )}
    </div>
  );
};

export default PartsList;
