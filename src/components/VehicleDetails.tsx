import React from 'react';
import { X, MapPin, Clock, Gauge, Navigation, User, Calendar, Car } from 'lucide-react';
import { Vehicle } from '../types/Vehicle';

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
}

export const VehicleDetails: React.FC<VehicleDetailsProps> = ({ vehicle, onClose }) => {
  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'parked':
        return 'bg-yellow-500';
      case 'maintenance':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Car className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{vehicle.plateNumber}</h2>
            <p className="text-gray-600">{vehicle.make} {vehicle.model}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Status</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(vehicle.status)}`}></div>
            <span className="text-sm text-gray-900 capitalize">{vehicle.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Year</p>
              <p className="text-sm font-medium">{vehicle.year}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full border-2 border-gray-300" style={{ backgroundColor: vehicle.color.toLowerCase() }}></div>
            <div>
              <p className="text-xs text-gray-500">Color</p>
              <p className="text-sm font-medium">{vehicle.color}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Owner</p>
            <p className="text-sm font-medium">{vehicle.owner}</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Location</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Gauge className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Speed</p>
                <p className="text-sm font-medium">{vehicle.speed} mph</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Navigation className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Heading</p>
                <p className="text-sm font-medium">{vehicle.heading}°</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">GPS Coordinates</span>
            </div>
            <p className="text-sm text-gray-600">
              {vehicle.gpsCoordinates.latitude.toFixed(6)}, {vehicle.gpsCoordinates.longitude.toFixed(6)}
            </p>
          </div>

          <div className="mt-4 flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Last Update</p>
              <p className="text-sm font-medium">{formatDate(vehicle.lastUpdate)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};