export interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  owner: string;
  gpsCoordinates: {
    latitude: number;
    longitude: number;
  };
  lastUpdate: Date;
  status: 'active' | 'inactive' | 'parked' | 'maintenance';
  speed: number;
  heading: number;
}

export interface TrackingHistory {
  vehicleId: string;
  timestamp: Date;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  speed: number;
  heading: number;
}