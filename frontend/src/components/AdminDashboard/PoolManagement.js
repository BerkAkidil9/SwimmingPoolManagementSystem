import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaMapMarkerAlt } from 'react-icons/fa';
import MapPicker from './MapPicker';

const PoolManagement = () => {
  const [pools, setPools] = useState([]);
  const [newPool, setNewPool] = useState({
    name: '',
    capacity: '',
    rules: '',
    location: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingPoolId, setEditingPoolId] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [isPoolListVisible, setIsPoolListVisible] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });

  useEffect(() => {
    fetchPools();
  }, []);

  const fetchPools = async () => {
    try {
      const response = await axios.get('/api/admin/pools');
      setPools(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load pools');
      setLoading(false);
    }
  };

  const handleDelete = async (poolId) => {
    if (window.confirm('Are you sure you want to delete this pool?')) {
      try {
        await axios.delete(`/api/admin/pools/${poolId}`);
        fetchPools(); // Refresh the list
        alert('Pool deleted successfully!');
      } catch (err) {
        alert('Failed to delete pool');
      }
    }
  };

  const handleEdit = async (poolId) => {
    const poolToEdit = pools.find(pool => pool.id === poolId);
    if (poolToEdit) {
      setNewPool(poolToEdit); // This will populate the form with existing data
      setIsEditing(true);
      setEditingPoolId(poolId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPool.name?.trim()) {
      alert('Lütfen havuz adını girin.');
      return;
    }
    if (!newPool.capacity || Number(newPool.capacity) <= 0) {
      alert('Lütfen geçerli bir kapasite girin.');
      return;
    }
    if (!newPool.rules?.trim()) {
      alert('Lütfen havuz kurallarını girin.');
      return;
    }
    if (!newPool.location?.trim()) {
      alert('Lütfen haritadan konum seçin.');
      return;
    }
    try {
      if (isEditing) {
        await axios.put(`/api/admin/pools/${editingPoolId}`, newPool);
        setIsEditing(false);
        setEditingPoolId(null);
      } else {
        await axios.post('/api/admin/pools', newPool);
      }
      setNewPool({ name: '', capacity: '', rules: '', location: '' });
      fetchPools();
      alert(isEditing ? 'Pool updated successfully!' : 'Pool added successfully!');
    } catch (err) {
      const msg = err.response?.data?.error || (isEditing ? 'Havuz güncellenemedi.' : 'Havuz eklenemedi.');
      alert(msg);
    }
  };

  const handleLocationSelect = (location) => {
    setNewPool(prev => ({
      ...prev,
      location: location
    }));
    setShowMap(false);
  };

  const sortPools = (poolsToSort, key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    const sortedPools = [...poolsToSort].sort((a, b) => {
      if (key === 'capacity') {
        return direction === 'ascending' 
          ? parseInt(a[key]) - parseInt(b[key])
          : parseInt(b[key]) - parseInt(a[key]);
      }
      
      return direction === 'ascending'
        ? a[key].localeCompare(b[key])
        : b[key].localeCompare(a[key]);
    });

    setSortConfig({ key, direction });
    return sortedPools;
  };

  const handleSort = (key) => {
    const sortedPools = sortPools(pools, key);
    setPools(sortedPools);
  };

  if (loading) return <p>Loading pools...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="pool-management">
      <div className="add-pool-form">
        <h3>{isEditing ? 'Edit Pool' : 'Add New Pool'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              value={newPool.name}
              onChange={(e) => setNewPool({...newPool, name: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Capacity:</label>
            <input
              type="number"
              value={newPool.capacity}
              onChange={(e) => setNewPool({...newPool, capacity: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Rules:</label>
            <input
              type="text"
              value={newPool.rules}
              onChange={(e) => setNewPool({...newPool, rules: e.target.value})}
              placeholder="Enter pool rules"
              maxLength="200"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Location:</label>
            <div className="location-picker">
              <input
                type="text"
                value={newPool.location}
                readOnly
                placeholder="Select location from map"
                required
              />
              <button 
                type="button" 
                className="map-picker-btn"
                onClick={() => setShowMap(!showMap)}
              >
                <FaMapMarkerAlt />
                Pick from Map
              </button>
            </div>
            {showMap && (
              <MapPicker
                onLocationSelect={handleLocationSelect}
                initialLocation={newPool.location}
              />
            )}
          </div>
          
          <button type="submit">
            {isEditing ? 'Update Pool' : 'Add Pool'}
          </button>
          {isEditing && (
            <button 
              type="button" 
              onClick={() => {
                setIsEditing(false);
                setEditingPoolId(null);
                setNewPool({ name: '', capacity: '', rules: '', location: '' });
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      <div className="pools-list">
        <div 
          className="pools-list-header" 
          onClick={() => setIsPoolListVisible(!isPoolListVisible)}
          style={{ cursor: 'pointer' }}
        >
          <h3>
            Existing Pools {isPoolListVisible ? '▼' : '▶'}
          </h3>
        </div>
        
        {isPoolListVisible && (
          <>
            <table>
              <colgroup>
                <col style={{ width: '90px' }} />
                <col style={{ width: '65px' }} />
                <col style={{ width: '22%' }} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} className="sortable">
                    Name {sortConfig.key === 'name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                  </th>
                  <th onClick={() => handleSort('capacity')} className="sortable">
                    Capacity {sortConfig.key === 'capacity' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                  </th>
                  <th className="location-header">Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pools.map(pool => (
                  <tr key={pool.id}>
                    <td>{pool.name}</td>
                    <td>{pool.capacity}</td>
                    <td className="location-cell">{pool.location || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          type="button" 
                          className="action-btn maps-btn"
                          onClick={() => window.open(`https://www.google.com/maps?q=${pool.location}`, '_blank', 'noopener,noreferrer')}
                        >
                          <FaMapMarkerAlt />
                          Open in Maps
                        </button>
                        <button type="button" className="action-btn edit-btn" onClick={() => handleEdit(pool.id)}>Edit</button>
                        <button type="button" className="action-btn delete-btn" onClick={() => handleDelete(pool.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default PoolManagement;