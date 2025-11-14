import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './CoachDashboard.css';
import Navbar from '../Navbar/Navbar';

const CoachDashboard = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Fetch the list of users when component mounts
    axios.get('/api/coach/members')
      .then(response => {
        console.log('Members fetched successfully:', response.data);
        setUsers(response.data);
      })
      .catch(error => {
        console.error("Failed to fetch members:", error);
      });
  }, []);

  // Handler to update a user's swimming ability
  const updateAbility = async (userId, ability) => {
    try {
      await axios.put(`/api/coach/members/${userId}/swimming-status`, { swimming_ability: ability.toLowerCase() });
      // Update the local state to reflect the new ability
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, swimming_ability: ability.toLowerCase() } : user
        )
      );
      console.log(`Updated user ${userId} swimming ability to: ${ability}`);
    } catch (error) {
      console.error("Failed to update swimming ability:", error);
      // Optionally, handle error (e.g., show notification)
    }
  };

  return (
    <>
      <Navbar />
      <div className="coach-dashboard">
      <h2>Coach Dashboard – User Swimming Abilities</h2>
      
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
                  {user.swimming_ability === 'yes' ? (
                    <span style={{ color: 'green', fontWeight: 'bold' }}>Can Swim</span>
                  ) : user.swimming_ability === 'no' ? (
                    <span style={{ color: 'red', fontWeight: 'bold' }}>Cannot Swim</span>
                  ) : (
                    <span style={{ color: 'gray', fontStyle: 'italic' }}>Not specified</span>
                  )}
                </td>
                <td>
                  <button 
                    onClick={() => updateAbility(user.id, 'yes')}
                    style={{ 
                      backgroundColor: user.swimming_ability === 'yes' ? '#4CAF50' : '#e0e0e0',
                      color: user.swimming_ability === 'yes' ? 'white' : 'black',
                      margin: '0 5px',
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Can Swim
                  </button>
                  <button 
                    onClick={() => updateAbility(user.id, 'no')}
                    style={{ 
                      backgroundColor: user.swimming_ability === 'no' ? '#f44336' : '#e0e0e0',
                      color: user.swimming_ability === 'no' ? 'white' : 'black',
                      margin: '0 5px',
                      padding: '5px 10px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cannot Swim
                  </button>
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
