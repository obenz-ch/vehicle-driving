import React from 'react';
import { Car, Navigation, Clock, AlertTriangle } from 'lucide-react';
import { Vehicle } from '../types/Vehicle';

interface DashboardProps {
  vehicles: Vehicle[];
}

export const Dashboard: React.FC<DashboardProps> = ({ vehicles }) => {
  const activeVehicles = vehicles.filter(v => v.status === 'active').length;
  const parkedVehicles = vehicles.filter(v => v.status === 'parked').length;
  const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
  const totalVehicles = vehicles.length;

  const stats = [
    {
      title: 'Total Vehicles',
      value: totalVehicles,
      icon: Car,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active',
      value: activeVehicles,
      icon: Navigation,
      color: 'bg-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Parked',
      value: parkedVehicles,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Maintenance',
      value: maintenanceVehicles,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} rounded-lg p-6 border border-gray-200`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};