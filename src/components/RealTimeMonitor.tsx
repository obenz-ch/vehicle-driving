import React, { useEffect, useState } from 'react';
import { RealGPSService, RealVehicleData } from '../services/realGPSService';
import { RealTimeAlertService } from '../services/realTimeAlertService';
import { supabase } from '../lib/supabase';
import { Activity, Wifi, WifiOff, AlertTriangle, MapPin, Gauge, Fuel, Clock } from 'lucide-react';

interface RealTimeMonitorProps {
  organizationId: string;
  selectedProvider: string;
  apiKey: string;
}

export const RealTimeMonitor: React.FC<RealTimeMonitorProps> = ({
  organizationId,
  selectedProvider,
  apiKey
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [vehicleData, setVehicleData] = useState<RealVehicleData[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [activeDevices, setActiveDevices] = useState(0);
  const [dataStats, setDataStats] = useState({
    totalUpdates: 0,
    avgUpdateInterval: 0,
    lastUpdateTime: null as Date | null
  });

  useEffect(() => {
    let gpsService: RealGPSService;
    let alertService: RealTimeAlertService;
    let updateInterval: NodeJS.Timeout;

    const initializeServices = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Initialize GPS service
        gpsService = new RealGPSService(selectedProvider, apiKey);
        alertService = new RealTimeAlertService();

        // Initialize real-time connection
        await gpsService.initializeRealTimeConnection(organizationId);

        // Get active devices
        const { data: devices } = await supabase
          .from('gps_devices')
          .select('device_id')
          .eq('status', 'active');

        if (devices && devices.length > 0) {
          setActiveDevices(devices.length);
          const deviceIds = devices.map(d => d.device_id);

          // Set up periodic data fetching
          updateInterval = setInterval(async () => {
            try {
              const vehicleUpdates = await gpsService.fetchVehicleData(deviceIds);
              setVehicleData(vehicleUpdates);
              
              // Process each update for alerts
              for (const update of vehicleUpdates) {
                await alertService.processVehicleData(update, organizationId);
              }

              // Update stats
              setDataStats(prev => ({
                totalUpdates: prev.totalUpdates + vehicleUpdates.length,
                avgUpdateInterval: 30, // 30 seconds
                lastUpdateTime: new Date()
              }));

            } catch (error) {
              console.error('Error fetching vehicle data:', error);
            }
          }, 30000); // 30 second intervals

          setIsConnected(true);
          setConnectionStatus('connected');
        }

        // Set up real-time subscriptions
        setupRealtimeSubscriptions();

      } catch (error) {
        console.error('Error initializing real-time services:', error);
        setConnectionStatus('disconnected');
        setIsConnected(false);
      }
    };

    const setupRealtimeSubscriptions = () => {
      // Subscribe to new alerts
      supabase
        .channel('alerts')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `organization_id=eq.${organizationId}`
        }, (payload) => {
          setRecentAlerts(prev => [payload.new, ...prev.slice(0, 4)]);
        })
        .subscribe();

      // Subscribe to location updates
      supabase
        .channel('location_updates')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'location_updates'
        }, (payload) => {
          // Update vehicle data with new location
          setVehicleData(prev => prev.map(vehicle => 
            vehicle.vehicleId === payload.new.vehicle_id
              ? {
                  ...vehicle,
                  latitude: payload.new.latitude,
                  longitude: payload.new.longitude,
                  speed: payload.new.speed,
                  heading: payload.new.heading,
                  timestamp: new Date(payload.new.timestamp)
                }
              : vehicle
          ));
        })
        .subscribe();
    };

    initializeServices();

    return () => {
      if (updateInterval) clearInterval(updateInterval);
      if (gpsService) gpsService.disconnect();
    };
  }, [organizationId, selectedProvider, apiKey]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="h-5 w-5" />;
      case 'connecting': return <Activity className="h-5 w-5 animate-pulse" />;
      case 'disconnected': return <WifiOff className="h-5 w-5" />;
      default: return <WifiOff className="h-5 w-5" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  const getEngineStatusColor = (status: string) => {
    switch (status) {
      case 'on': return 'text-green-600';
      case 'idle': return 'text-yellow-600';
      case 'off': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Real-Time Monitoring</h3>
          <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium capitalize">{connectionStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">Active Devices</p>
                <p className="text-2xl font-bold text-blue-900">{activeDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-green-600">Live Vehicles</p>
                <p className="text-2xl font-bold text-green-900">{vehicleData.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-600">Recent Alerts</p>
                <p className="text-2xl font-bold text-yellow-900">{recentAlerts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600">Total Updates</p>
                <p className="text-2xl font-bold text-purple-900">{dataStats.totalUpdates}</p>
              </div>
            </div>
          </div>
        </div>

        {dataStats.lastUpdateTime && (
          <div className="mt-4 text-sm text-gray-600">
            Last update: {formatTimestamp(dataStats.lastUpdateTime)}
          </div>
        )}
      </div>

      {/* Live Vehicle Data */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Live Vehicle Data</h4>
        
        {vehicleData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {vehicleData.map((vehicle, index) => (
              <div key={vehicle.deviceId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">Device: {vehicle.deviceId}</h5>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      Date.now() - vehicle.timestamp.getTime() < 60000 ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(vehicle.timestamp)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-medium">{vehicle.latitude.toFixed(6)}, {vehicle.longitude.toFixed(6)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Gauge className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-600">Speed</p>
                      <p className="font-medium">{vehicle.speed} mph</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Activity className={`h-4 w-4 ${getEngineStatusColor(vehicle.engineStatus)}`} />
                    <div>
                      <p className="text-gray-600">Engine</p>
                      <p className={`font-medium capitalize ${getEngineStatusColor(vehicle.engineStatus)}`}>
                        {vehicle.engineStatus}
                      </p>
                    </div>
                  </div>

                  {vehicle.fuelLevel && (
                    <div className="flex items-center space-x-2">
                      <Fuel className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-600">Fuel</p>
                        <p className="font-medium">{vehicle.fuelLevel}%</p>
                      </div>
                    </div>
                  )}

                  {vehicle.odometer && (
                    <div className="col-span-2">
                      <p className="text-gray-600">Odometer</p>
                      <p className="font-medium">{vehicle.odometer.toLocaleString()} miles</p>
                    </div>
                  )}
                </div>

                {vehicle.diagnosticCodes && vehicle.diagnosticCodes.length > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs font-medium text-yellow-800">Diagnostic Codes:</p>
                    <p className="text-xs text-yellow-700">{vehicle.diagnosticCodes.join(', ')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No live data available</h3>
            <p className="text-gray-500">
              {isConnected ? 'Waiting for vehicle updates...' : 'Connect to GPS service to see live data'}
            </p>
          </div>
        )}
      </div>

      {/* Recent Alerts */}
      {recentAlerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h4>
          <div className="space-y-3">
            {recentAlerts.map((alert, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.severity === 'critical' ? 'text-red-600' :
                  alert.severity === 'high' ? 'text-orange-600' :
                  alert.severity === 'medium' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-600">{alert.message}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(new Date(alert.created_at))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Error */}
      {!isConnected && connectionStatus === 'disconnected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Connection Failed</p>
              <p className="text-xs text-red-600">
                Unable to connect to GPS tracking service. Please check your API key and provider settings.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};