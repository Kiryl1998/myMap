import mapboxgl from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';
import './App.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(18.6843);
  const [lat, setLat] = useState(54.3451);
  const [zoom, setZoom] = useState(11);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom,
    });
  });

  return (
    <div className="App">
      <div ref={mapContainer} className="map-container" />
    </div>
  );
}

export default App;
