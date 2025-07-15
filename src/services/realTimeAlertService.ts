import { supabase } from '../lib/supabase';
import { RealVehicleData } from './realGPSService';

export interface AlertRule {
  id: string;
  organizationId: string;
  name: string;
  type: 'speeding' | 'geofence' | 'maintenance' | 'device_offline' | 'panic' | 'harsh_driving' | 'idle_time' | 'fuel_theft';
  conditions: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notificationMethods: ('email' | 'sms' | 'push' | 'webhook')[];
  recipients: string[];
}

export interface ProcessedAlert {
  id: string;
  organizationId: string;
  vehicleId: string;
  driverId?: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  location?: { lat: number; lng: number };
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  metadata?: any;
}

export class RealTimeAlertService {
  private alertRules: Map<string, AlertRule[]> = new Map();
  private speedLimitCache: Map<string, { limit: number; timestamp: Date }> = new Map();

  constructor() {
    this.loadAlertRules();
    this.setupRealTimeSubscriptions();
  }

  // Load alert rules from database
  async loadAlertRules(): Promise<void> {
    try {
      const { data: rules } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('enabled', true);

      if (rules) {
        // Group rules by organization
        const rulesByOrg = new Map<string, AlertRule[]>();
        rules.forEach(rule => {
          const orgRules = rulesByOrg.get(rule.organization_id) || [];
          orgRules.push(rule);
          rulesByOrg.set(rule.organization_id, orgRules);
        });
        this.alertRules = rulesByOrg;
      }
    } catch (error) {
      console.error('Error loading alert rules:', error);
    }
  }

  // Process real-time vehicle data for alerts
  async processVehicleData(data: RealVehicleData, organizationId: string): Promise<void> {
    try {
      const rules = this.alertRules.get(organizationId) || [];
      
      for (const rule of rules) {
        await this.evaluateRule(rule, data);
      }
    } catch (error) {
      console.error('Error processing vehicle data for alerts:', error);
    }
  }

  // Evaluate individual alert rule
  private async evaluateRule(rule: AlertRule, data: RealVehicleData): Promise<void> {
    try {
      switch (rule.type) {
        case 'speeding':
          await this.checkSpeedingViolation(rule, data);
          break;
        case 'geofence':
          await this.checkGeofenceViolation(rule, data);
          break;
        case 'harsh_driving':
          await this.checkHarshDriving(rule, data);
          break;
        case 'idle_time':
          await this.checkIdleTime(rule, data);
          break;
        case 'device_offline':
          await this.checkDeviceOffline(rule, data);
          break;
        case 'fuel_theft':
          await this.checkFuelTheft(rule, data);
          break;
        case 'maintenance':
          await this.checkMaintenanceAlerts(rule, data);
          break;
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.name}:`, error);
    }
  }

  // Speeding violation detection
  private async checkSpeedingViolation(rule: AlertRule, data: RealVehicleData): Promise<void> {
    const speedLimit = await this.getSpeedLimit(data.latitude, data.longitude);
    const tolerance = rule.conditions.tolerance || 5;
    
    if (data.speed > speedLimit + tolerance) {
      const severity = data.speed > speedLimit + 20 ? 'high' : 
                     data.speed > speedLimit + 10 ? 'medium' : 'low';
      
      await this.createAlert({
        organizationId: rule.organizationId,
        vehicleId: data.vehicleId,
        alertType: 'speeding',
        severity,
        title: `Speeding Violation`,
        message: `Vehicle traveling at ${data.speed} mph in ${speedLimit} mph zone`,
        location: { lat: data.latitude, lng: data.longitude },
        timestamp: data.timestamp,
        metadata: {
          currentSpeed: data.speed,
          speedLimit,
          violation: data.speed - speedLimit
        }
      });
    }
  }

  // Geofence violation detection
  private async checkGeofenceViolation(rule: AlertRule, data: RealVehicleData): Promise<void> {
    try {
      // Get vehicle's organization geofences
      const { data: geofences } = await supabase
        .from('geofences')
        .select('*')
        .eq('organization_id', rule.organizationId)
        .eq('active', true);

      if (!geofences) return;

      for (const geofence of geofences) {
        const isInside = this.isPointInGeofence(data, geofence);
        
        // Get previous location to determine entry/exit
        const { data: prevLocation } = await supabase
          .from('location_updates')
          .select('latitude, longitude')
          .eq('vehicle_id', data.vehicleId)
          .order('timestamp', { ascending: false })
          .limit(2);

        if (prevLocation && prevLocation.length > 1) {
          const wasInside = this.isPointInGeofence(prevLocation[1], geofence);
          
          if (isInside && !wasInside && geofence.alert_on_entry) {
            await this.createAlert({
              organizationId: rule.organizationId,
              vehicleId: data.vehicleId,
              alertType: 'geofence_entry',
              severity: 'medium',
              title: `Geofence Entry - ${geofence.name}`,
              message: `Vehicle entered ${geofence.name}`,
              location: { lat: data.latitude, lng: data.longitude },
              timestamp: data.timestamp,
              metadata: { geofenceName: geofence.name }
            });
          } else if (!isInside && wasInside && geofence.alert_on_exit) {
            await this.createAlert({
              organizationId: rule.organizationId,
              vehicleId: data.vehicleId,
              alertType: 'geofence_exit',
              severity: 'medium',
              title: `Geofence Exit - ${geofence.name}`,
              message: `Vehicle exited ${geofence.name}`,
              location: { lat: data.latitude, lng: data.longitude },
              timestamp: data.timestamp,
              metadata: { geofenceName: geofence.name }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking geofence violations:', error);
    }
  }

  // Harsh driving detection
  private async checkHarshDriving(rule: AlertRule, data: RealVehicleData): Promise<void> {
    try {
      // Get recent location updates to calculate acceleration/deceleration
      const { data: recentLocations } = await supabase
        .from('location_updates')
        .select('speed, timestamp')
        .eq('vehicle_id', data.vehicleId)
        .order('timestamp', { ascending: false })
        .limit(3);

      if (!recentLocations || recentLocations.length < 2) return;

      const current = { speed: data.speed, timestamp: data.timestamp };
      const previous = recentLocations[0];
      
      const timeDiff = (current.timestamp.getTime() - new Date(previous.timestamp).getTime()) / 1000;
      const speedDiff = current.speed - previous.speed;
      const acceleration = speedDiff / timeDiff;

      const harshAccelThreshold = rule.conditions.harshAcceleration || 8; // mph/s
      const harshBrakeThreshold = rule.conditions.harshBraking || -8; // mph/s

      if (acceleration > harshAccelThreshold) {
        await this.createAlert({
          organizationId: rule.organizationId,
          vehicleId: data.vehicleId,
          alertType: 'harsh_acceleration',
          severity: 'medium',
          title: 'Harsh Acceleration Detected',
          message: `Rapid acceleration detected: ${acceleration.toFixed(1)} mph/s`,
          location: { lat: data.latitude, lng: data.longitude },
          timestamp: data.timestamp,
          metadata: { acceleration }
        });
      } else if (acceleration < harshBrakeThreshold) {
        await this.createAlert({
          organizationId: rule.organizationId,
          vehicleId: data.vehicleId,
          alertType: 'harsh_braking',
          severity: 'medium',
          title: 'Harsh Braking Detected',
          message: `Hard braking detected: ${Math.abs(acceleration).toFixed(1)} mph/s`,
          location: { lat: data.latitude, lng: data.longitude },
          timestamp: data.timestamp,
          metadata: { deceleration: Math.abs(acceleration) }
        });
      }
    } catch (error) {
      console.error('Error checking harsh driving:', error);
    }
  }

  // Idle time detection
  private async checkIdleTime(rule: AlertRule, data: RealVehicleData): Promise<void> {
    if (data.speed > 5 || data.engineStatus !== 'idle') return;

    try {
      // Check how long vehicle has been idle
      const { data: idleStart } = await supabase
        .from('location_updates')
        .select('timestamp')
        .eq('vehicle_id', data.vehicleId)
        .gt('speed', 5)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (idleStart && idleStart.length > 0) {
        const idleMinutes = (data.timestamp.getTime() - new Date(idleStart[0].timestamp).getTime()) / 60000;
        const idleThreshold = rule.conditions.idleThreshold || 15; // minutes

        if (idleMinutes > idleThreshold) {
          await this.createAlert({
            organizationId: rule.organizationId,
            vehicleId: data.vehicleId,
            alertType: 'excessive_idle',
            severity: 'low',
            title: 'Excessive Idle Time',
            message: `Vehicle has been idling for ${Math.round(idleMinutes)} minutes`,
            location: { lat: data.latitude, lng: data.longitude },
            timestamp: data.timestamp,
            metadata: { idleMinutes: Math.round(idleMinutes) }
          });
        }
      }
    } catch (error) {
      console.error('Error checking idle time:', error);
    }
  }

  // Device offline detection
  private async checkDeviceOffline(rule: AlertRule, data: RealVehicleData): Promise<void> {
    const offlineThreshold = rule.conditions.offlineThreshold || 5; // minutes
    const timeSinceUpdate = (Date.now() - data.timestamp.getTime()) / 60000;

    if (timeSinceUpdate > offlineThreshold) {
      await this.createAlert({
        organizationId: rule.organizationId,
        vehicleId: data.vehicleId,
        alertType: 'device_offline',
        severity: 'high',
        title: 'Device Offline',
        message: `GPS device has been offline for ${Math.round(timeSinceUpdate)} minutes`,
        timestamp: new Date(),
        metadata: { offlineMinutes: Math.round(timeSinceUpdate) }
      });
    }
  }

  // Fuel theft detection
  private async checkFuelTheft(rule: AlertRule, data: RealVehicleData): Promise<void> {
    if (!data.fuelLevel) return;

    try {
      // Get recent fuel levels
      const { data: recentFuel } = await supabase
        .from('location_updates')
        .select('fuel_level, timestamp')
        .eq('vehicle_id', data.vehicleId)
        .not('fuel_level', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (!recentFuel || recentFuel.length < 2) return;

      const fuelDrop = recentFuel[0].fuel_level - data.fuelLevel;
      const timeDiff = (data.timestamp.getTime() - new Date(recentFuel[0].timestamp).getTime()) / 60000;
      
      // Detect sudden fuel drop when vehicle is not moving
      if (fuelDrop > 20 && data.speed < 5 && timeDiff < 30) {
        await this.createAlert({
          organizationId: rule.organizationId,
          vehicleId: data.vehicleId,
          alertType: 'fuel_theft',
          severity: 'critical',
          title: 'Potential Fuel Theft',
          message: `Sudden fuel drop of ${fuelDrop.toFixed(1)}% detected while vehicle stationary`,
          location: { lat: data.latitude, lng: data.longitude },
          timestamp: data.timestamp,
          metadata: { fuelDrop, previousLevel: recentFuel[0].fuel_level, currentLevel: data.fuelLevel }
        });
      }
    } catch (error) {
      console.error('Error checking fuel theft:', error);
    }
  }

  // Maintenance alerts
  private async checkMaintenanceAlerts(rule: AlertRule, data: RealVehicleData): Promise<void> {
    if (!data.odometer) return;

    try {
      const { data: maintenanceRecords } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('vehicle_id', data.vehicleId)
        .eq('completed', false)
        .not('next_service_mileage', 'is', null);

      if (!maintenanceRecords) return;

      for (const record of maintenanceRecords) {
        const mileageUntilService = record.next_service_mileage - data.odometer;
        
        if (mileageUntilService <= 500) { // Within 500 miles of service
          const severity = mileageUntilService <= 100 ? 'high' : 'medium';
          
          await this.createAlert({
            organizationId: rule.organizationId,
            vehicleId: data.vehicleId,
            alertType: 'maintenance_due',
            severity,
            title: `Maintenance Due Soon`,
            message: `${record.maintenance_type.replace('_', ' ')} due in ${mileageUntilService} miles`,
            timestamp: data.timestamp,
            metadata: {
              maintenanceType: record.maintenance_type,
              currentMileage: data.odometer,
              serviceMileage: record.next_service_mileage,
              milesRemaining: mileageUntilService
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking maintenance alerts:', error);
    }
  }

  // Create and store alert
  private async createAlert(alertData: Omit<ProcessedAlert, 'id' | 'acknowledged' | 'resolved'>): Promise<void> {
    try {
      // Check for duplicate alerts (same type, vehicle, within last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const { data: existingAlert } = await supabase
        .from('alerts')
        .select('id')
        .eq('organization_id', alertData.organizationId)
        .eq('vehicle_id', alertData.vehicleId)
        .eq('alert_type', alertData.alertType)
        .gte('created_at', thirtyMinutesAgo.toISOString())
        .limit(1);

      if (existingAlert && existingAlert.length > 0) {
        return; // Skip duplicate alert
      }

      // Create new alert
      const { data: alert, error } = await supabase
        .from('alerts')
        .insert({
          organization_id: alertData.organizationId,
          vehicle_id: alertData.vehicleId,
          driver_id: alertData.driverId,
          alert_type: alertData.alertType,
          severity: alertData.severity,
          title: alertData.title,
          message: alertData.message,
          location_latitude: alertData.location?.lat,
          location_longitude: alertData.location?.lng,
          metadata: alertData.metadata,
          acknowledged: false,
          resolved: false
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications
      await this.sendNotifications(alert);

      // Broadcast real-time alert
      this.broadcastAlert(alert);

    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }

  // Send notifications based on alert rules
  private async sendNotifications(alert: any): Promise<void> {
    try {
      // Get notification preferences for the organization
      const { data: preferences } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', alert.organization_id)
        .eq('alert_type', alert.alert_type);

      if (!preferences || preferences.length === 0) return;

      for (const pref of preferences) {
        if (pref.email_enabled) {
          await this.sendEmailNotification(alert, pref.email_recipients);
        }
        
        if (pref.sms_enabled) {
          await this.sendSMSNotification(alert, pref.sms_recipients);
        }
        
        if (pref.webhook_enabled) {
          await this.sendWebhookNotification(alert, pref.webhook_url);
        }
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  // Helper methods
  private async getSpeedLimit(lat: number, lng: number): Promise<number> {
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = this.speedLimitCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp.getTime()) < 3600000) { // 1 hour cache
      return cached.limit;
    }

    try {
      // Use OpenStreetMap Overpass API to get speed limits
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=[out:json];way(around:100,${lat},${lng})[highway][maxspeed];out;`);
      const data = await response.json();
      
      let speedLimit = 35; // Default speed limit
      
      if (data.elements && data.elements.length > 0) {
        const way = data.elements[0];
        if (way.tags && way.tags.maxspeed) {
          const maxspeed = way.tags.maxspeed;
          speedLimit = parseInt(maxspeed.replace(/[^\d]/g, '')) || 35;
        }
      }

      this.speedLimitCache.set(cacheKey, { limit: speedLimit, timestamp: new Date() });
      return speedLimit;
    } catch (error) {
      console.error('Error fetching speed limit:', error);
      return 35; // Default fallback
    }
  }

  private isPointInGeofence(point: any, geofence: any): boolean {
    if (geofence.fence_type === 'circular') {
      const distance = this.calculateDistance(
        point.latitude,
        point.longitude,
        geofence.center_latitude,
        geofence.center_longitude
      );
      return distance <= geofence.radius;
    } else if (geofence.fence_type === 'polygon') {
      return this.isPointInPolygon(point, geofence.polygon_coordinates);
    }
    return false;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private isPointInPolygon(point: any, polygon: any): boolean {
    let inside = false;
    const coordinates = polygon.coordinates[0];
    
    for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
      if (((coordinates[i][1] > point.latitude) !== (coordinates[j][1] > point.latitude)) &&
          (point.longitude < (coordinates[j][0] - coordinates[i][0]) * (point.latitude - coordinates[i][1]) / (coordinates[j][1] - coordinates[i][1]) + coordinates[i][0])) {
        inside = !inside;
      }
    }
    return inside;
  }

  private async sendEmailNotification(alert: any, recipients: string[]): Promise<void> {
    // Implementation would use email service like SendGrid, AWS SES, etc.
    console.log('Sending email notification:', alert.title, 'to:', recipients);
  }

  private async sendSMSNotification(alert: any, recipients: string[]): Promise<void> {
    // Implementation would use SMS service like Twilio, AWS SNS, etc.
    console.log('Sending SMS notification:', alert.title, 'to:', recipients);
  }

  private async sendWebhookNotification(alert: any, webhookUrl: string): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Error sending webhook notification:', error);
    }
  }

  private broadcastAlert(alert: any): void {
    supabase.channel('alerts')
      .send({
        type: 'broadcast',
        event: 'new_alert',
        payload: alert
      });
  }

  private setupRealTimeSubscriptions(): void {
    // Listen for alert rule changes
    supabase
      .channel('alert_rules')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alert_rules'
      }, () => {
        this.loadAlertRules();
      })
      .subscribe();
  }
}