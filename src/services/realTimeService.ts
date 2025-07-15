import { supabase } from '../lib/supabase';
import { GPSTrackingService } from './gpsTrackingService';
import { AlertService } from './alertService';

export class RealTimeService {
  private gpsService: GPSTrackingService;
  private alertService: AlertService;
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, (data: any) => void> = new Map();

  constructor(gpsService: GPSTrackingService) {
    this.gpsService = gpsService;
    this.alertService = new AlertService();
  }

  // Start real-time tracking
  async startTracking(organizationId: string, updateIntervalMs: number = 30000) {
    try {
      // Get all active vehicles for the organization
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select(`
          id,
          plate_number,
          gps_devices(device_id, status)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .not('gps_devices', 'is', null);

      if (!vehicles || vehicles.length === 0) {
        console.log('No vehicles with GPS devices found');
        return;
      }

      const deviceIds = vehicles
        .filter(v => v.gps_devices?.status === 'active')
        .map(v => v.gps_devices!.device_id);

      if (deviceIds.length === 0) {
        console.log('No active GPS devices found');
        return;
      }

      // Set up periodic location updates
      this.updateInterval = setInterval(async () => {
        try {
          const locations = await this.gpsService.fetchVehicleLocations(deviceIds);
          await this.gpsService.storeLocationUpdates(locations);
          
          // Process each location update for alerts
          for (const location of locations) {
            await this.processLocationForAlerts(location, organizationId);
          }

          // Notify subscribers
          this.notifySubscribers('location_updates', locations);
        } catch (error) {
          console.error('Error in tracking update:', error);
        }
      }, updateIntervalMs);

      console.log(`Started real-time tracking for ${deviceIds.length} devices`);
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw error;
    }
  }

  // Stop real-time tracking
  stopTracking() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('Stopped real-time tracking');
    }
  }

  // Process location updates for alert generation
  private async processLocationForAlerts(location: any, organizationId: string) {
    try {
      // Get vehicle info
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select(`
          id,
          plate_number,
          assigned_driver_id,
          gps_devices(device_id)
        `)
        .eq('gps_devices.device_id', location.deviceId)
        .single();

      if (!vehicle) return;

      // Check for speeding
      await this.checkSpeeding(vehicle.id, location);

      // Check geofences
      await this.checkGeofences(vehicle.id, location, organizationId);

      // Update trip information
      await this.updateTripData(vehicle.id, location);

    } catch (error) {
      console.error('Error processing location for alerts:', error);
    }
  }

  // Check for speeding violations
  private async checkSpeeding(vehicleId: string, location: any) {
    const speedLimit = await this.getSpeedLimit(location.latitude, location.longitude);
    
    if (location.speed > speedLimit + 5) { // 5 mph tolerance
      await this.alertService.createSpeedingAlert(
        vehicleId,
        location.speed,
        speedLimit,
        { lat: location.latitude, lng: location.longitude }
      );
    }
  }

  // Get speed limit for location (mock implementation)
  private async getSpeedLimit(lat: number, lng: number): Promise<number> {
    // In a real implementation, this would query a speed limit API
    // For now, return a default based on location type
    try {
      const response = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${lng-0.001},${lat-0.001},${lng+0.001},${lat+0.001}`);
      // Parse OSM data for speed limits
      // This is a simplified example
      return 35; // Default speed limit
    } catch {
      return 35; // Default fallback
    }
  }

  // Check geofence violations
  private async checkGeofences(vehicleId: string, location: any, organizationId: string) {
    try {
      const { data: geofences } = await supabase
        .from('geofences')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true);

      if (!geofences) return;

      for (const geofence of geofences) {
        const isInside = this.isPointInGeofence(location, geofence);
        
        // Get previous location to determine entry/exit
        const { data: prevLocation } = await supabase
          .from('location_updates')
          .select('latitude, longitude')
          .eq('vehicle_id', vehicleId)
          .order('timestamp', { ascending: false })
          .limit(2);

        if (prevLocation && prevLocation.length > 1) {
          const wasInside = this.isPointInGeofence(prevLocation[1], geofence);
          
          if (isInside && !wasInside && geofence.alert_on_entry) {
            await this.alertService.createGeofenceAlert(
              vehicleId,
              geofence.name,
              'entry',
              { lat: location.latitude, lng: location.longitude }
            );
          } else if (!isInside && wasInside && geofence.alert_on_exit) {
            await this.alertService.createGeofenceAlert(
              vehicleId,
              geofence.name,
              'exit',
              { lat: location.latitude, lng: location.longitude }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error checking geofences:', error);
    }
  }

  // Check if point is inside geofence
  private isPointInGeofence(location: any, geofence: any): boolean {
    if (geofence.fence_type === 'circular') {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        geofence.center_latitude,
        geofence.center_longitude
      );
      return distance <= geofence.radius;
    } else if (geofence.fence_type === 'polygon') {
      return this.isPointInPolygon(location, geofence.polygon_coordinates);
    }
    return false;
  }

  // Calculate distance between two points
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Convert to meters
  }

  // Point in polygon check
  private isPointInPolygon(point: any, polygon: any): boolean {
    // Ray casting algorithm implementation
    let inside = false;
    const coordinates = polygon.coordinates[0]; // Assuming first ring for simplicity
    
    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      if (((coordinates[i][1] > point.latitude) !== (coordinates[j][1] > point.latitude)) &&
          (point.longitude < (coordinates[j][0] - coordinates[i][0]) * (point.latitude - coordinates[i][1]) / (coordinates[j][1] - coordinates[i][1]) + coordinates[i][0])) {
        inside = !inside;
      }
    }
    return inside;
  }

  // Update trip data
  private async updateTripData(vehicleId: string, location: any) {
    try {
      // Get current active trip
      const { data: currentTrip } = await supabase
        .from('trips')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('trip_status', 'in_progress')
        .order('start_time', { ascending: false })
        .limit(1)
        .single();

      if (currentTrip) {
        // Update existing trip
        const distance = this.calculateDistance(
          currentTrip.start_location_lat,
          currentTrip.start_location_lng,
          location.latitude,
          location.longitude
        );

        await supabase
          .from('trips')
          .update({
            end_location_lat: location.latitude,
            end_location_lng: location.longitude,
            distance_km: distance / 1000,
            max_speed: Math.max(currentTrip.max_speed || 0, location.speed),
            updated_at: new Date().toISOString()
          })
          .eq('id', currentTrip.id);
      } else if (location.speed > 5) {
        // Start new trip if vehicle is moving
        await supabase
          .from('trips')
          .insert({
            vehicle_id: vehicleId,
            start_location_lat: location.latitude,
            start_location_lng: location.longitude,
            start_time: location.timestamp,
            max_speed: location.speed,
            trip_status: 'in_progress'
          });
      }
    } catch (error) {
      console.error('Error updating trip data:', error);
    }
  }

  // Subscribe to real-time updates
  subscribe(eventType: string, callback: (data: any) => void): string {
    const subscriptionId = `${eventType}_${Date.now()}_${Math.random()}`;
    this.subscribers.set(subscriptionId, callback);
    return subscriptionId;
  }

  // Unsubscribe from updates
  unsubscribe(subscriptionId: string) {
    this.subscribers.delete(subscriptionId);
  }

  // Notify all subscribers
  private notifySubscribers(eventType: string, data: any) {
    this.subscribers.forEach((callback, id) => {
      if (id.startsWith(eventType)) {
        callback(data);
      }
    });
  }

  // Set up Supabase real-time subscriptions
  setupRealtimeSubscriptions(organizationId: string) {
    // Location updates subscription
    supabase
      .channel('location_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'location_updates'
      }, (payload) => {
        this.notifySubscribers('location_updates', payload.new);
      })
      .subscribe();

    // Alerts subscription
    supabase
      .channel('alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: `organization_id=eq.${organizationId}`
      }, (payload) => {
        this.notifySubscribers('alerts', payload.new);
      })
      .subscribe();
  }
}