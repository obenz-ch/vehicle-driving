import React from 'react';
import { Car, Clock, Gauge, Navigation, User, Calendar } from 'lucide-react';
import { Vehicle } from '../types/Vehicle';

interface VehicleCardProps {
  vehicle: Vehicle;
  onViewMap: (vehicle: Vehicle) => void;
}

export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onViewMap }) => {
  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'parked':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastUpdate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{vehicle.plateNumber}</h3>
              <p className="text-sm text-gray-600">{vehicle.make} {vehicle.model}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
            {vehicle.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{vehicle.year}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full border-2 border-gray-300" style={{ backgroundColor: vehicle.color.toLowerCase() }}></div>
            <span className="text-sm text-gray-600">{vehicle.color}</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{vehicle.owner}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Gauge className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{vehicle.speed} mph</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Last seen {formatLastUpdate(vehicle.lastUpdate)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Navigation className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{vehicle.heading}°</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <p>Lat: {vehicle.gpsCoordinates.latitude.toFixed(4)}</p>
            <p>Lng: {vehicle.gpsCoordinates.longitude.toFixed(4)}</p>
          </div>
          <button
            onClick={() => onViewMap(vehicle)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            View on Map
          </button>
        </div>
      </div>
    </div>
  );
};