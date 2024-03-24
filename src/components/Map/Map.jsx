import mapboxgl from 'mapbox-gl';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { useEffect, useRef, useState } from 'react';
import { getDistance } from './getDistance';

import './Map.css';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;

const MapComponent = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const inputRef = useRef(null);
  const distanceContainer = useRef(null);
  const [lng, setLng] = useState(18.6843);
  const [lat, setLat] = useState(54.3451);
  const [zoom, setZoom] = useState(11);
  const [distance, setDistance] = useState(null);

  // GeoJSON object to hold our measurement features
  const geojson = {
    type: 'FeatureCollection',
    features: [],
  };

  // Used to draw a line between points
  const linestring = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [],
    },
  };

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.FullscreenControl());
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      })
    );

    map.current.on('load', () => {
      map.current.addSource('geojson', {
        type: 'geojson',
        data: geojson,
      });

      // Add styles to the map
      map.current.addLayer({
        id: 'measure-points',
        type: 'circle',
        source: 'geojson',
        paint: {
          'circle-radius': 5,
          'circle-color': '#000',
        },
        filter: ['in', '$type', 'Point'],
      });
      map.current.addLayer({
        id: 'measure-lines',
        type: 'line',
        source: 'geojson',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#000',
          'line-width': 2.5,
        },
        filter: ['in', '$type', 'LineString'],
      });

      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl: mapboxgl,
      });

      geocoder.on('result', (e) => {
        const { result } = e;
        const { geometry, place_name } = result;

        const point = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: geometry.coordinates,
          },
          properties: {
            id: String(new Date().getTime()),
            address: place_name,
          },
        };

        geojson.features.push(point);
        map.current.getSource('geojson').setData(geojson);
      });

      map.current.addControl(geocoder);

      map.current.on('click', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['measure-points'],
        });

        // Remove the linestring from the group
        // so we can redraw it based on the points collection.
        if (geojson.features.length > 1) geojson.features.pop();

        // Clear the distance container to populate it with a new value.
        distanceContainer.innerHTML = '';

        // If a feature was clicked, remove it from the map.
        if (features.length) {
          const id = features[0].properties.id;
          geojson.features = geojson.features.filter(
            (point) => point.properties.id !== id
          );
        } else {
          const point = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [e.lngLat.lng, e.lngLat.lat],
            },
            properties: {
              id: String(new Date().getTime()),
            },
          };

          geojson.features.push(point);
        }

        if (geojson.features.length > 1) {
          linestring.geometry.coordinates = geojson.features.map(
            (point) => point.geometry.coordinates
          );

          geojson.features.push(linestring);

          let totalDistance = 0; // Total distance between all points

          // Iterate through all coordinate pairs and calculate the distance between them
          for (let i = 0; i < linestring.geometry.coordinates.length - 1; i++) {
            const distance = getDistance(
              linestring.geometry.coordinates[i],
              linestring.geometry.coordinates[i + 1]
            );
            totalDistance += distance; // Add the distance to the total distance
          }

          setDistance(totalDistance.toFixed(3)); // Changing distance state
        }

        map.current.getSource('geojson').setData(geojson);
      });

      map.current.on('mousemove', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['measure-points'],
        });
        // Change the cursor to a pointer when hovering over a point on the map.
        // Otherwise cursor is a crosshair.
        map.current.getCanvas().style.cursor = features.length
          ? 'pointer'
          : 'crosshair';
      });
    });
  });

  useEffect(() => {
    if (!map.current) return; // wait for map to initialize
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });
  });

  return (
    <>
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <div ref={mapContainer} className="h-screen w-screen" />
      <div
        ref={distanceContainer}
        id="distance"
        className={[distance != null ? 'distance-container' : 'hidden'].join(
          ' '
        )}
      >
        Total distance: {distance} km
      </div>
    </>
  );
};

export default MapComponent;
