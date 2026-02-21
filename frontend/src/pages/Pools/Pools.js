import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Pools.css';

const Pools = () => {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get('/api/pools', { timeout: 15000 })
      .then((response) => {
        setPools(response.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching pools:', err);
        setError(err.response?.data?.error || "Failed to load pools. Please try again later.");
        setLoading(false);
        setPools([]);
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
      {pools.length === 0 ? (
        <p className="no-pools">No pools available at the moment.</p>
      ) : (
      pools.map((pool) => (
        <div key={pool.id} className="pool-card">
          <h3>{pool.name}</h3>
          <p>Capacity: {pool.capacity}</p>
          <p>Rules: {pool.rules}</p>
          <a href={`https://www.google.com/maps?q=${pool.location}`} target="_blank" rel="noopener noreferrer" className="map-link">
            Open in Maps
          </a>
        </div>
      )))}
    </div>
  );
};

export default Pools;
