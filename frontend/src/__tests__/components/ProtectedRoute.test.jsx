import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import axios from 'axios';

// Mock axios to return unauthenticated by default
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { isAuthenticated: false } })),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => axios.get.mockReset().mockResolvedValue({ data: { isAuthenticated: false } }));

  function LoginDestination() {
    const location = useLocation();
    return <output>{new URLSearchParams(location.search).get('returnTo')}</output>;
  }

  it.each(['/upload-health-report/42', '/health-report-upload?userId=42'])(
    'preserves the report destination for an unauthenticated visitor: %s', async target => {
      render(
        <MemoryRouter initialEntries={[target]}>
          <Routes>
            <Route path="/upload-health-report/:userId" element={<ProtectedRoute><div>Protected content</div></ProtectedRoute>} />
            <Route path="/health-report-upload" element={<ProtectedRoute><div>Protected content</div></ProtectedRoute>} />
            <Route path="/login" element={<LoginDestination />} />
          </Routes>
        </MemoryRouter>
      );
      expect(await screen.findByText(target)).toBeInTheDocument();
      expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    },
  );

  it('continues to show protected content after authentication', async () => {
    axios.get.mockResolvedValue({ data: { isAuthenticated: true, user: { id: 42, role: 'user' } } });
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });
});
