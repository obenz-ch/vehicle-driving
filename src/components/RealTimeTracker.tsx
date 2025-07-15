import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealTimeService } from '../services/realTimeService';
import { GPSTrackingService } from '../services/gpsTrackingService';
import { AlertService } from '../services/alertService';
import { Bell, Wifi, WifiOff, Activity, AlertTriangle } from 'lucide-react';

interface RealTimeTrackerProps {
  organizationId: string;
  onLocationUpdate?: (locations: any[]) => void;
  onAlert?: (alert: any) => void;
}

export const RealTimeTracker: React.FC<RealTimeTrackerProps> = ({
  organizationId,
  onLocationUpdate,
  onAlert
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeDevices, setActiveDevices] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    let realTimeService: RealTimeService;
    let alertService: AlertService;

    const initializeServices = async () => {
      try {
        setConnectionStatus('connecting');
        
        // Initialize services
        const gpsService = new GPSTrackingService('verizon', 'demo-api-key');
        realTimeService = new RealTimeService(gpsService);
        alertService = new AlertService();

        // Set up real-time subscriptions
        realTimeService.setupRealtimeSubscriptions(organizationId);

        // Subscribe to location updates
        realTimeService.subscribe('location_updates', (locations) => {
          if (onLocationUpdate) {
            onLocationUpdate(locations);
          }
        });

        // Subscribe to alerts
        realTimeService.subscribe('alerts', (alert) => {
          setRecentAlerts(prev => [alert, ...prev.slice(0, 4)]);
          if (onAlert) {
            onAlert(alert);
          }
        });

        // Start tracking
        await realTimeService.startTracking(organizationId, 30000); // 30 second intervals

        setIsConnected(true);
        setConnectionStatus('connected');

        // Get initial device count
        const { data: devices } = await supabase
          .from('gps_devices')
          .select('id')
          .eq('status', 'active');
        
        setActiveDevices(devices?.length || 0);

        // Load recent alerts
        const alerts = await alertService.getAlerts(organizationId, { limit: 5 });
        setRecentAlerts(alerts || []);

      } catch (error) {
        console.error('Error initializing real-time services:', error);
        setConnectionStatus('disconnected');
        setIsConnected(false);
      }
    };

    initializeServices();

    return () => {
      if (realTimeService) {
        realTimeService.stopTracking();
      }
    };
  }, [organizationId, onLocationUpdate, onAlert]);

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
      case 'connected': return <Wifi className="h-4 w-4" />;
      case 'connecting': return <Activity className="h-4 w-4 animate-pulse" />;
      case 'disconnected': return <WifiOff className="h-4 w-4" />;
      default: return <WifiOff className="h-4 w-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Real-Time Tracking</h3>
        <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium capitalize">{connectionStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            <Wifi className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-green-600">Connection</p>
              <p className="text-lg font-semibold text-green-900">
                {isConnected ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm text-yellow-600">Recent Alerts</p>
              <p className="text-2xl font-bold text-yellow-900">{recentAlerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {recentAlerts.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Recent Alerts</h4>
          <div className="space-y-2">
            {recentAlerts.map((alert, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className={`h-4 w-4 ${
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
                  {new Date(alert.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Connection Lost</p>
              <p className="text-xs text-red-600">
                Unable to connect to GPS tracking services. Please check your configuration.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};