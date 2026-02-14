import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PoolManagement from '../../components/AdminDashboard/PoolManagement';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
}));

describe('PoolManagement', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <PoolManagement />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
