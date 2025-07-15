import { supabase } from '../lib/supabase';

// GPS Tracking Service Integration
export class GPSTrackingService {
  private apiKey: string;
  private provider: 'verizon' | 'geotab' | 'fleet_complete';
  private baseUrl: string;

  constructor(provider: 'verizon' | 'geotab' | 'fleet_complete', apiKey: string) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.baseUrl = this.getBaseUrl(provider);
  }

  private getBaseUrl(provider: string): string {
    switch (provider) {
      case 'verizon':
        return 'https://api.verizonconnect.com/v1';
      case 'geotab':
        return 'https://my.geotab.com/apiv1';
      case 'fleet_complete':
        return 'https://api.fleetcomplete.com/v1';
      default:
        throw new Error('Unsupported GPS provider');
    }
  }

  // Fetch real-time vehicle locations from GPS provider
  async fetchVehicleLocations(deviceIds: string[]): Promise<LocationUpdate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/locations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          devices: deviceIds,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`GPS API error: ${response.statusText}`);
      }

      const data = await response.json();
      return this.normalizeLocationData(data);
    } catch (error) {
      console.error('Error fetching vehicle locations:', error);
      throw error;
    }
  }

  // Normalize location data from different providers
  private normalizeLocationData(data: any): LocationUpdate[] {
    switch (this.provider) {
      case 'verizon':
        return data.locations.map((loc: any) => ({
          deviceId: loc.device_id,
          latitude: loc.lat,
          longitude: loc.lng,
          speed: loc.speed_mph,
          heading: loc.heading,
          timestamp: new Date(loc.timestamp),
          accuracy: loc.accuracy,
          address: loc.address
        }));
      
      case 'geotab':
        return data.result.map((loc: any) => ({
          deviceId: loc.device.id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          speed: loc.speed * 2.237, // Convert m/s to mph
          heading: loc.bearing,
          timestamp: new Date(loc.dateTime),
          accuracy: loc.accuracy,
          address: loc.address
        }));
      
      case 'fleet_complete':
        return data.vehicles.map((vehicle: any) => ({
          deviceId: vehicle.device_id,
          latitude: vehicle.location.latitude,
          longitude: vehicle.location.longitude,
          speed: vehicle.speed,
          heading: vehicle.heading,
          timestamp: new Date(vehicle.last_update),
          accuracy: vehicle.gps_accuracy,
          address: vehicle.address
        }));
      
      default:
        return [];
    }
  }

  // Store location updates in database
  async storeLocationUpdates(updates: LocationUpdate[]): Promise<void> {
    try {
      // Get vehicle IDs from device IDs
      const deviceIds = updates.map(u => u.deviceId);
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, gps_device_id')
        .in('gps_device_id', deviceIds);

      if (!vehicles) return;

      const locationData = updates.map(update => {
        const vehicle = vehicles.find(v => v.gps_device_id === update.deviceId);
        if (!vehicle) return null;

        return {
          vehicle_id: vehicle.id,
          device_id: update.deviceId,
          latitude: update.latitude,
          longitude: update.longitude,
          speed: update.speed,
          heading: update.heading,
          timestamp: update.timestamp.toISOString(),
          accuracy: update.accuracy,
          address: update.address
        };
      }).filter(Boolean);

      const { error } = await supabase
        .from('location_updates')
        .insert(locationData);

      if (error) {
        console.error('Error storing location updates:', error);
        throw error;
      }

      // Trigger real-time updates
      this.broadcastLocationUpdates(locationData);
    } catch (error) {
      console.error('Error in storeLocationUpdates:', error);
      throw error;
    }
  }

  // Broadcast real-time updates via WebSocket
  private broadcastLocationUpdates(updates: any[]): void {
    updates.forEach(update => {
      supabase.channel('location_updates')
        .send({
          type: 'broadcast',
          event: 'location_update',
          payload: update
        });
    });
  }

  // Set up geofence monitoring
  async setupGeofenceMonitoring(vehicleId: string, geofences: Geofence[]): Promise<void> {
    // Implementation would depend on GPS provider's geofencing capabilities
    try {
      const response = await fetch(`${this.baseUrl}/geofences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          geofences: geofences.map(gf => ({
            name: gf.name,
            type: gf.fence_type,
            coordinates: gf.fence_type === 'circular' 
              ? { lat: gf.center_latitude, lng: gf.center_longitude, radius: gf.radius }
              : { polygon: gf.polygon_coordinates }
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Geofence setup error: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error setting up geofences:', error);
      throw error;
    }
  }
}

// Types
export interface LocationUpdate {
  deviceId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: Date;
  accuracy?: number;
  address?: string;
}

export interface Geofence {
  name: string;
  fence_type: 'circular' | 'polygon';
  center_latitude?: number;
  center_longitude?: number;
  radius?: number;
  polygon_coordinates?: any;
}

// Factory function to create GPS service instance
export function createGPSService(): GPSTrackingService {
  const provider = (import.meta.env.VITE_GPS_PROVIDER || 'verizon') as 'verizon' | 'geotab' | 'fleet_complete';
  const apiKey = import.meta.env.VITE_GPS_API_KEY;
  
  if (!apiKey) {
    throw new Error('GPS API key not configured');
  }
  
  return new GPSTrackingService(provider, apiKey);
}