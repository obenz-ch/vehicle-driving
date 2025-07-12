import { Vehicle, TrackingHistory } from '../types/Vehicle';

export const mockVehicles: Vehicle[] = [
  {
    id: '1',
    plateNumber: 'ABC-123',
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    color: 'Silver',
    owner: 'John Smith',
    gpsCoordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    },
    lastUpdate: new Date('2025-01-08T10:30:00'),
    status: 'active',
    speed: 35,
    heading: 90
  },
  {
    id: '2',
    plateNumber: 'XYZ-789',
    make: 'Honda',
    model: 'Civic',
    year: 2021,
    color: 'Blue',
    owner: 'Sarah Johnson',
    gpsCoordinates: {
      latitude: 40.7589,
      longitude: -73.9851
    },
    lastUpdate: new Date('2025-01-08T10:25:00'),
    status: 'parked',
    speed: 0,
    heading: 0
  },
  {
    id: '3',
    plateNumber: 'DEF-456',
    make: 'Ford',
    model: 'F-150',
    year: 2023,
    color: 'Red',
    owner: 'Mike Davis',
    gpsCoordinates: {
      latitude: 40.7505,
      longitude: -73.9934
    },
    lastUpdate: new Date('2025-01-08T10:28:00'),
    status: 'active',
    speed: 28,
    heading: 180
  },
  {
    id: '4',
    plateNumber: 'GHI-321',
    make: 'Tesla',
    model: 'Model 3',
    year: 2024,
    color: 'White',
    owner: 'Lisa Chen',
    gpsCoordinates: {
      latitude: 40.7282,
      longitude: -73.7949
    },
    lastUpdate: new Date('2025-01-08T10:32:00'),
    status: 'active',
    speed: 45,
    heading: 270
  },
  {
    id: '5',
    plateNumber: 'JKL-654',
    make: 'BMW',
    model: 'X5',
    year: 2023,
    color: 'Black',
    owner: 'Robert Wilson',
    gpsCoordinates: {
      latitude: 40.7831,
      longitude: -73.9712
    },
    lastUpdate: new Date('2025-01-08T10:20:00'),
    status: 'maintenance',
    speed: 0,
    heading: 0
  }
];

export const mockTrackingHistory: TrackingHistory[] = [
  {
    vehicleId: '1',
    timestamp: new Date('2025-01-08T09:00:00'),
    coordinates: { latitude: 40.7050, longitude: -74.0100 },
    speed: 30,
    heading: 45
  },
  {
    vehicleId: '1',
    timestamp: new Date('2025-01-08T09:30:00'),
    coordinates: { latitude: 40.7089, longitude: -74.0080 },
    speed: 25,
    heading: 80
  },
  {
    vehicleId: '1',
    timestamp: new Date('2025-01-08T10:00:00'),
    coordinates: { latitude: 40.7100, longitude: -74.0070 },
    speed: 40,
    heading: 85
  },
  {
    vehicleId: '1',
    timestamp: new Date('2025-01-08T10:30:00'),
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    speed: 35,
    heading: 90
  }
];