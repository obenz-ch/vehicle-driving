import React, { useEffect, useRef } from 'react';
import { Vehicle } from '../types/Vehicle';

interface MapProps {
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle;
  onVehicleSelect: (vehicle: Vehicle) => void;
}

export const Map: React.FC<MapProps> = ({ vehicles, selectedVehicle, onVehicleSelect }) => {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    // Dynamically import Leaflet to avoid SSR issues
    const initializeMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return;

      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        // Fix for default markers
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Initialize map
        mapRef.current = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 11);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapRef.current);

        // Add initial markers
        updateMarkers(L);
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const updateMarkers = async (L: any) => {
    if (!mapRef.current || !L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => mapRef.current?.removeLayer(marker));
    markersRef.current = [];

    // Add markers for each vehicle
    vehicles.forEach(vehicle => {
      const icon = L.divIcon({
        html: `
          <div class="relative">
            <div class="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
              </svg>
            </div>
            ${vehicle.status === 'active' ? '<div class="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>' : ''}
          </div>
        `,
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([vehicle.gpsCoordinates.latitude, vehicle.gpsCoordinates.longitude], { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div class="p-2">
            <h3 class="font-bold text-lg mb-1">${vehicle.plateNumber}</h3>
            <p class="text-sm text-gray-600 mb-1">${vehicle.make} ${vehicle.model}</p>
            <p class="text-sm text-gray-600 mb-1">Owner: ${vehicle.owner}</p>
            <p class="text-sm text-gray-600 mb-1">Speed: ${vehicle.speed} mph</p>
            <p class="text-sm text-gray-600">Status: ${vehicle.status}</p>
          </div>
        `)
        .on('click', () => onVehicleSelect(vehicle));

      markersRef.current.push(marker);
    });

    // Focus on selected vehicle
    if (selectedVehicle && mapRef.current) {
      mapRef.current.setView([selectedVehicle.gpsCoordinates.latitude, selectedVehicle.gpsCoordinates.longitude], 15);
    }
  };

  useEffect(() => {
    const updateMarkersAsync = async () => {
      if (mapRef.current) {
        const L = await import('leaflet');
        updateMarkers(L);
      }
    };

    updateMarkersAsync();
  }, [vehicles, selectedVehicle, onVehicleSelect]);

  return (
    <div className="h-full w-full relative">
      <div ref={mapContainerRef} className="h-full w-full rounded-lg shadow-lg z-0" />
      {vehicles.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No vehicles to display</p>
        </div>
      )}
    </div>
  );
};