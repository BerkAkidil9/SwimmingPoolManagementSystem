import React from 'react';
import { render } from '@testing-library/react';
import MapPicker from '../../components/AdminDashboard/MapPicker';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
}));

describe('MapPicker', () => {
  it('renders map', () => {
    const mockOnLocationSelect = jest.fn();
    render(<MapPicker onLocationSelect={mockOnLocationSelect} />);
    expect(document.querySelector('[data-testid="map"]')).toBeInTheDocument();
  });
});
