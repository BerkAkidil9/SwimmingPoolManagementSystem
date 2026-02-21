import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Pools.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const Pools = () => {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = `${API_BASE}/api/pools`;
    axios
      .get(url, { 
        timeout: 20000, 
        withCredentials: false 
      })
      .then((response) => {
        setPools(response.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching pools:', err);
        const msg = err.code === 'ECONNABORTED' 
          ? "Request timed out. Please try again." 
          : (err.response?.data?.error || err.message || "Failed to load pools. Please try again later.");
        setError(msg);
        setLoading(false);
        setPools([]);
      });
  }, []);

  if (loading) {
    return <p>Loading pools...</p>;
  }

  if (error) {
    return (
      <div className="pools-error">
        <p className="error">{error}</p>
        <button 
          type="button" 
          className="retry-btn"
          onClick={() => {
            setError("");
            setLoading(true);
            const url = `${API_BASE}/api/pools`;
            axios.get(url, { timeout: 20000, withCredentials: false })
              .then((res) => { setPools(res.data || []); setLoading(false); setError(""); })
              .catch((err) => { 
                setError(err.code === 'ECONNABORTED' ? "Request timed out. Try again." : (err.response?.data?.error || "Failed to load pools.")); 
                setLoading(false); 
              });
          }}
        >
          Try Again
        </button>
      </div>
    );
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
