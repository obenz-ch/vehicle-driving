import React, { useState, useEffect } from 'react';
import { DeviceManagementService } from '../services/deviceManagementService';
import { Smartphone, Wifi, Battery, Signal, Settings, Plus, AlertTriangle } from 'lucide-react';

interface Device {
  id: string;
  device_id: string;
  device_type: string;
  manufacturer?: string;
  model?: string;
  battery_level?: number;
  signal_strength?: number;
  status: string;
  last_heartbeat?: string;
  vehicles?: {
    plate_number: string;
  };
}

interface DeviceManagementProps {
  organizationId: string;
}

export const DeviceManagement: React.FC<DeviceManagementProps> = ({ organizationId }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [healthReport, setHealthReport] = useState<any[]>([]);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [loading, setLoading] = useState(true);
  const deviceService = new DeviceManagementService();

  useEffect(() => {
    loadDevices();
    loadHealthReport();
  }, [organizationId]);

  const loadDevices = async () => {
    try {
      // This would be implemented to fetch devices for the organization
      // For now, we'll use mock data
      setDevices([
        {
          id: '1',
          device_id: 'DEV001',
          device_type: 'obd',
          manufacturer: 'Verizon',
          model: 'VT200',
          battery_level: 85,
          signal_strength: 92,
          status: 'active',
          last_heartbeat: new Date().toISOString(),
          vehicles: { plate_number: 'ABC-123' }
        },
        {
          id: '2',
          device_id: 'DEV002',
          device_type: 'hardwired',
          manufacturer: 'Geotab',
          model: 'GO9',
          battery_level: 100,
          signal_strength: 78,
          status: 'active',
          last_heartbeat: new Date(Date.now() - 300000).toISOString(),
          vehicles: { plate_number: 'XYZ-789' }
        }
      ]);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealthReport = async () => {
    try {
      const report = await deviceService.performHealthCheck(organizationId);
      setHealthReport(report);
    } catch (error) {
      console.error('Error loading health report:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'smartphone':
        return <Smartphone className="h-5 w-5" />;
      case 'obd':
        return <Settings className="h-5 w-5" />;
      default:
        return <Wifi className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const isDeviceOffline = (lastHeartbeat?: string) => {
    if (!lastHeartbeat) return true;
    const lastUpdate = new Date(lastHeartbeat);
    const now = new Date();
    return (now.getTime() - lastUpdate.getTime()) > 300000; // 5 minutes
  };

  const AddDeviceForm = () => {
    const [formData, setFormData] = useState({
      device_id: '',
      imei: '',
      device_type: 'obd',
      manufacturer: '',
      model: '',
      sim_card_number: '',
      data_plan_provider: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await deviceService.registerDevice(formData);
        setShowAddDevice(false);
        loadDevices();
      } catch (error) {
        console.error('Error adding device:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Add New Device</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device ID
              </label>
              <input
                type="text"
                value={formData.device_id}
                onChange={(e) => setFormData({...formData, device_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device Type
              </label>
              <select
                value={formData.device_type}
                onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="obd">OBD-II Port</option>
                <option value="hardwired">Hardwired</option>
                <option value="battery">Battery Powered</option>
                <option value="smartphone">Smartphone App</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowAddDevice(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Device
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Device Management</h3>
        <button
          onClick={() => setShowAddDevice(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Add Device</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => (
          <div key={device.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {getDeviceIcon(device.device_type)}
                <span className="font-medium text-gray-900">{device.device_id}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                {device.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle:</span>
                <span className="font-medium">{device.vehicles?.plate_number || 'Unassigned'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="capitalize">{device.device_type}</span>
              </div>

              {device.manufacturer && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Model:</span>
                  <span>{device.manufacturer} {device.model}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Battery className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Battery:</span>
                </div>
                <span className={`font-medium ${
                  device.battery_level && device.battery_level > 50 ? 'text-green-600' :
                  device.battery_level && device.battery_level > 20 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {device.battery_level || 'N/A'}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Signal className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Signal:</span>
                </div>
                <span className={`font-medium ${
                  device.signal_strength && device.signal_strength > 70 ? 'text-green-600' :
                  device.signal_strength && device.signal_strength > 40 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {device.signal_strength || 'N/A'}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <div className="flex items-center space-x-1">
                  {isDeviceOffline(device.last_heartbeat) ? (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-600 text-xs">Offline</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-600 text-xs">Online</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isDeviceOffline(device.last_heartbeat) && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-red-600">Device offline for over 5 minutes</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {devices.length === 0 && (
        <div className="text-center py-8">
          <Wifi className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No devices registered</h3>
          <p className="text-gray-500 mb-4">Add your first GPS tracking device to get started.</p>
          <button
            onClick={() => setShowAddDevice(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Device
          </button>
        </div>
      )}

      {showAddDevice && <AddDeviceForm />}
    </div>
  );
};