import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CoachDashboard.css';
import Navbar from '../Navbar/Navbar';

const CoachDashboard = () => {
  const [users, setUsers] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/coach/members')
      .then(response => {
        setUsers(response.data);
      })
      .catch(err => {
        console.error("Failed to fetch members:", err);
        setError("Üyeler yüklenemedi.");
      });
  }, []);

  const handleSave = async (userId, ability) => {
    if (!ability || !['yes', 'no'].includes(ability)) return;
    setSavingId(userId);
    setError(null);
    try {
      await axios.put(`/api/coach/members/${userId}/swimming-status`, { 
        swimming_ability: ability.toLowerCase() 
      });
      setUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, swimming_ability: ability } : u)
      );
      setSuccessId(userId);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Kaydetme başarısız.");
    } finally {
      setSavingId(null);
    }
  };

  const getDisplayValue = (val) => {
    const v = (val || '').toLowerCase();
    if (v === 'yes') return 'yes';
    if (v === 'no') return 'no';
    return 'yes'; // Default to Can Swim when not set
  };

  return (
    <>
      <Navbar />
      <div className="coach-dashboard">
        <h2>Coach Dashboard – User Swimming Abilities</h2>
        
        {error && (
          <div className="coach-error-message">{error}</div>
        )}
        
        {users.length === 0 ? (
          <div className="no-data-message">
            <p>No member data available. Members will appear here once registered.</p>
          </div>
        ) : (
          <table className="coach-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Swimming Ability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name} {user.surname}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || 'Not provided'}</td>
                  <td>
                    <select
                      className="coach-select"
                      value={getDisplayValue(user.swimming_ability)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsers(prev => 
                          prev.map(u => u.id === user.id ? { ...u, swimming_ability: val } : u)
                        );
                      }}
                    >
                      <option value="yes">Can Swim</option>
                      <option value="no">Cannot Swim</option>
                    </select>
                  </td>
                  <td className="coach-actions-cell">
                    <button
                      className="coach-save-btn"
                      onClick={() => handleSave(user.id, getDisplayValue(user.swimming_ability))}
                      disabled={savingId === user.id}
                    >
                      {savingId === user.id ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    {successId === user.id && (
                      <span className="coach-saved-badge">Kaydedildi ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

export default CoachDashboard;
