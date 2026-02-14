import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock heavy dependencies to avoid ESM/transpile and API issues
jest.mock('./components/AdminDashboard/AdminDashboard', () => () => <div data-testid="admin-dashboard" />);
jest.mock('./components/DoctorDashboard/DoctorDashboard', () => () => <div data-testid="doctor-dashboard" />);
jest.mock('./components/CoachDashboard/CoachDashboard', () => () => <div data-testid="coach-dashboard" />);
jest.mock('./pages/LandingPage/LandingPage', () => () => <div data-testid="landing-page">Landing</div>);
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  useMapEvents: () => null,
}));

test('App renders without crashing', () => {
  render(<App />);
  expect(screen.getByTestId('landing-page')).toBeInTheDocument();
});

test('App header exists', () => {
  render(<App />);
  expect(document.querySelector('.App-header')).toBeInTheDocument();
});

