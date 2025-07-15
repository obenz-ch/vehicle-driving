import { supabase } from '../lib/supabase';
import { getProviderConfig } from '../config/gpsProviders';

export interface RealVehicleData {
  deviceId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude?: number;
  accuracy?: number;
  timestamp: Date;
  engineStatus: 'on' | 'off' | 'idle';
  fuelLevel?: number;
  odometer?: number;
  engineHours?: number;
  diagnosticCodes?: string[];
}

export interface DeviceStatus {
  deviceId: string;
  isOnline: boolean;
  batteryLevel?: number;
  signalStrength: number;
  lastHeartbeat: Date;
  firmwareVersion?: string;
  hardwareVersion?: string;
}

export class RealGPSService {
  private provider: string;
  private apiKey: string;
  private config: any;
  private wsConnection: WebSocket | null = null;

  constructor(provider: string, apiKey: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.config = getProviderConfig(provider);
  }

  // Initialize real-time connection
  async initializeRealTimeConnection(organizationId: string): Promise<void> {
    try {
      // Set up WebSocket connection for real-time updates
      const wsUrl = `${this.config.baseUrl.replace('https', 'wss')}/realtime`;
      this.wsConnection = new WebSocket(wsUrl, ['gps-tracking']);

      this.wsConnection.onopen = () => {
        console.log('Real-time GPS connection established');
        this.authenticate();
      };

      this.wsConnection.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleRealTimeUpdate(data, organizationId);
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.reconnect(organizationId);
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket connection closed');
        setTimeout(() => this.reconnect(organizationId), 5000);
      };

    } catch (error) {
      console.error('Error initializing real-time connection:', error);
      throw error;
    }
  }

  // Authenticate with GPS provider
  private authenticate(): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      const authMessage = {
        type: 'auth',
        token: this.apiKey,
        provider: this.provider
      };
      this.wsConnection.send(JSON.stringify(authMessage));
    }
  }

  // Handle real-time updates
  private async handleRealTimeUpdate(data: any, organizationId: string): Promise<void> {
    try {
      const normalizedData = this.normalizeRealTimeData(data);
      
      // Store in database
      await this.storeRealTimeData(normalizedData, organizationId);
      
      // Process for alerts
      await this.processForAlerts(normalizedData, organizationId);
      
      // Broadcast to connected clients
      this.broadcastUpdate(normalizedData);
      
    } catch (error) {
      console.error('Error handling real-time update:', error);
    }
  }

  // Fetch vehicle data from GPS provider
  async fetchVehicleData(deviceIds: string[]): Promise<RealVehicleData[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}${this.config.endpoints.locations}`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          devices: deviceIds,
          timestamp: new Date().toISOString(),
          includeEngineData: true,
          includeDiagnostics: true
        })
      });

      if (!response.ok) {
        throw new Error(`GPS API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeVehicleData(data);
      
    } catch (error) {
      console.error('Error fetching vehicle data:', error);
      throw error;
    }
  }

  // Fetch device status
  async fetchDeviceStatus(deviceIds: string[]): Promise<DeviceStatus[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}${this.config.endpoints.devices}/status`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ devices: deviceIds })
      });

      if (!response.ok) {
        throw new Error(`Device status API error: ${response.status}`);
      }

      const data = await response.json();
      return this.normalizeDeviceStatus(data);
      
    } catch (error) {
      console.error('Error fetching device status:', error);
      throw error;
    }
  }

  // Register new device with GPS provider
  async registerDevice(deviceInfo: {
    deviceId: string;
    imei: string;
    vehicleId: string;
    deviceType: string;
    simCardNumber?: string;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}${this.config.endpoints.devices}`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_id: deviceInfo.deviceId,
          imei: deviceInfo.imei,
          vehicle_id: deviceInfo.vehicleId,
          device_type: deviceInfo.deviceType,
          sim_card: deviceInfo.simCardNumber,
          activation_date: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Device registration failed: ${response.status}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  // Set up geofences with GPS provider
  async setupGeofences(vehicleId: string, geofences: any[]): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/geofences`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          geofences: geofences.map(gf => ({
            name: gf.name,
            type: gf.fence_type,
            coordinates: gf.fence_type === 'circular' 
              ? { lat: gf.center_latitude, lng: gf.center_longitude, radius: gf.radius }
              : { polygon: gf.polygon_coordinates },
            alert_on_entry: gf.alert_on_entry,
            alert_on_exit: gf.alert_on_exit
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Geofence setup failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error setting up geofences:', error);
      throw error;
    }
  }

  // Send remote commands to device
  async sendDeviceCommand(deviceId: string, command: string, params?: any): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}${this.config.endpoints.devices}/${deviceId}/commands`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command,
          parameters: params,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Command failed: ${response.status}`);
      }

      return await response.json();
      
    } catch (error) {
      console.error('Error sending device command:', error);
      throw error;
    }
  }

  // Normalize data from different providers
  private normalizeVehicleData(data: any): RealVehicleData[] {
    switch (this.provider) {
      case 'verizon':
        return data.locations?.map((loc: any) => ({
          deviceId: loc.device_id,
          vehicleId: loc.vehicle_id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed_mph,
          heading: loc.heading,
          altitude: loc.altitude,
          accuracy: loc.accuracy,
          timestamp: new Date(loc.timestamp),
          engineStatus: loc.engine_status,
          fuelLevel: loc.fuel_level,
          odometer: loc.odometer,
          engineHours: loc.engine_hours,
          diagnosticCodes: loc.diagnostic_codes
        })) || [];

      case 'geotab':
        return data.result?.map((loc: any) => ({
          deviceId: loc.device.id,
          vehicleId: loc.device.id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed * 2.237, // Convert m/s to mph
          heading: loc.bearing,
          timestamp: new Date(loc.dateTime),
          engineStatus: loc.engineStatus,
          fuelLevel: loc.fuelLevel,
          odometer: loc.odometer
        })) || [];

      case 'fleetComplete':
        return data.positions?.map((pos: any) => ({
          deviceId: pos.device_id,
          vehicleId: pos.vehicle_id,
          latitude: pos.location.latitude,
          longitude: pos.location.longitude,
          speed: pos.speed,
          heading: pos.heading,
          timestamp: new Date(pos.timestamp),
          engineStatus: pos.engine_status,
          fuelLevel: pos.fuel_level
        })) || [];

      case 'samsara':
        return data.data?.map((vehicle: any) => ({
          deviceId: vehicle.id,
          vehicleId: vehicle.id,
          latitude: vehicle.gpsLocation.latitude,
          longitude: vehicle.gpsLocation.longitude,
          speed: vehicle.gpsLocation.speedMilesPerHour,
          heading: vehicle.gpsLocation.heading,
          timestamp: new Date(vehicle.gpsLocation.timeMs),
          engineStatus: vehicle.engineStates?.[0]?.value,
          fuelLevel: vehicle.fuelPercents?.[0]?.value,
          odometer: vehicle.odometerMeters
        })) || [];

      default:
        return [];
    }
  }

  private normalizeDeviceStatus(data: any): DeviceStatus[] {
    switch (this.provider) {
      case 'verizon':
        return data.devices?.map((device: any) => ({
          deviceId: device.device_id,
          isOnline: device.status === 'online',
          batteryLevel: device.battery_level,
          signalStrength: device.signal_strength,
          lastHeartbeat: new Date(device.last_heartbeat),
          firmwareVersion: device.firmware_version
        })) || [];

      case 'geotab':
        return data.result?.map((device: any) => ({
          deviceId: device.id,
          isOnline: device.isOnline,
          signalStrength: device.signalStrength,
          lastHeartbeat: new Date(device.lastCommunication),
          firmwareVersion: device.version
        })) || [];

      default:
        return [];
    }
  }

  private normalizeRealTimeData(data: any): RealVehicleData {
    // Normalize real-time data based on provider
    return {
      deviceId: data.device_id || data.deviceId,
      vehicleId: data.vehicle_id || data.vehicleId,
      latitude: data.latitude || data.lat,
      longitude: data.longitude || data.lng,
      speed: data.speed || 0,
      heading: data.heading || data.bearing || 0,
      timestamp: new Date(data.timestamp || Date.now()),
      engineStatus: data.engine_status || 'unknown',
      fuelLevel: data.fuel_level,
      odometer: data.odometer
    };
  }

  private getAuthHeader(): string {
    switch (this.config.authType) {
      case 'bearer':
        return `Bearer ${this.apiKey}`;
      case 'api_key':
        return `ApiKey ${this.apiKey}`;
      default:
        return this.apiKey;
    }
  }

  private async storeRealTimeData(data: RealVehicleData, organizationId: string): Promise<void> {
    try {
      // Get vehicle ID from device ID
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('gps_device_id', data.deviceId)
        .single();

      if (!vehicle) return;

      // Store location update
      await supabase
        .from('location_updates')
        .insert({
          vehicle_id: vehicle.id,
          device_id: data.deviceId,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          heading: data.heading,
          altitude: data.altitude,
          accuracy: data.accuracy,
          timestamp: data.timestamp.toISOString()
        });

      // Update vehicle status
      await supabase
        .from('vehicles')
        .update({
          status: data.engineStatus === 'on' ? 'active' : 'parked',
          mileage: data.odometer,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicle.id);

    } catch (error) {
      console.error('Error storing real-time data:', error);
    }
  }

  private async processForAlerts(data: RealVehicleData, organizationId: string): Promise<void> {
    // Process data for various alert conditions
    // This would include speeding, geofence violations, maintenance alerts, etc.
    // Implementation would be similar to the existing alert service
  }

  private broadcastUpdate(data: RealVehicleData): void {
    // Broadcast to connected clients via Supabase realtime
    supabase.channel('vehicle_updates')
      .send({
        type: 'broadcast',
        event: 'location_update',
        payload: data
      });
  }

  private reconnect(organizationId: string): void {
    setTimeout(() => {
      this.initializeRealTimeConnection(organizationId);
    }, 5000);
  }

  // Cleanup
  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}