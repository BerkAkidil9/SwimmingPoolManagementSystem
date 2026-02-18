import React, { useState, useEffect } from 'react';
import './Pools.css';

const Pools = () => {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/pools`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch pools");
        }
        return response.json();
      })
      .then((data) => {
        setPools(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching pools:', error);
        setError("Failed to load pools. Please try again later.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p>Loading pools...</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  return (
    <div className="pool-list">
      {pools.map((pool) => (
        <div key={pool.id} className="pool-card">
          <h3>{pool.name}</h3>
          <p>Capacity: {pool.capacity}</p>
          <p>Rules: {pool.rules}</p>
          <a href={`https://www.google.com/maps?q=${pool.location}`} target="_blank" rel="noopener noreferrer" className="map-link">
            Open in Maps
          </a>
        </div>
      ))}
    </div>
  );
};

export default Pools;
