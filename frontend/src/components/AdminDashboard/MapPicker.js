import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPicker.css';

// Leaflet marker icon fix
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Location picker component
const LocationMarker = ({ onLocationSelect }) => {
  const [position, setPosition] = React.useState(null);
  
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      onLocationSelect(`${lat}, ${lng}`);
    }
  });

  return position === null ? null : <Marker position={position} />;
};

const MapPicker = ({ onLocationSelect }) => {
  // Istanbul coordinates
  const defaultPosition = [41.0082, 28.9784];

  return (
    <div className="map-picker-container">
      <MapContainer 
        center={defaultPosition} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
};

export default MapPicker; 