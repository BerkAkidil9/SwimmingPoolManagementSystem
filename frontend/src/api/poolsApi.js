import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export async function fetchPools() {
  const response = await axios.get(`${API_BASE}/pools`, {
    timeout: 20000,
    withCredentials: false,
  });
  return response.data || [];
}
