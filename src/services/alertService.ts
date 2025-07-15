import { supabase } from '../lib/supabase';

export class AlertService {
  // Create different types of alerts
  async createSpeedingAlert(vehicleId: string, currentSpeed: number, speedLimit: number, location: { lat: number, lng: number }) {
    try {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('organization_id, plate_number, drivers(first_name, last_name)')
        .eq('id', vehicleId)
        .single();

      if (!vehicle) return;

      await supabase
        .from('alerts')
        .insert({
          organization_id: vehicle.organization_id,
          vehicle_id: vehicleId,
          alert_type: 'speeding',
          severity: currentSpeed > speedLimit + 20 ? 'high' : 'medium',
          title: `Speeding Alert - ${vehicle.plate_number}`,
          message: `Vehicle traveling at ${currentSpeed} mph in ${speedLimit} mph zone`,
          location_latitude: location.lat,
          location_longitude: location.lng
        });

      // Send real-time notification
      this.broadcastAlert('speeding', {
        vehicleId,
        plateNumber: vehicle.plate_number,
        currentSpeed,
        speedLimit,
        location
      });

    } catch (error) {
      console.error('Error creating speeding alert:', error);
    }
  }

  async createGeofenceAlert(vehicleId: string, geofenceName: string, alertType: 'entry' | 'exit', location: { lat: number, lng: number }) {
    try {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('organization_id, plate_number')
        .eq('id', vehicleId)
        .single();

      if (!vehicle) return;

      await supabase
        .from('alerts')
        .insert({
          organization_id: vehicle.organization_id,
          vehicle_id: vehicleId,
          alert_type: `geofence_${alertType}`,
          severity: 'medium',
          title: `Geofence ${alertType.charAt(0).toUpperCase() + alertType.slice(1)} - ${vehicle.plate_number}`,
          message: `Vehicle ${alertType === 'entry' ? 'entered' : 'exited'} ${geofenceName}`,
          location_latitude: location.lat,
          location_longitude: location.lng
        });

      this.broadcastAlert(`geofence_${alertType}`, {
        vehicleId,
        plateNumber: vehicle.plate_number,
        geofenceName,
        location
      });

    } catch (error) {
      console.error('Error creating geofence alert:', error);
    }
  }

  async createMaintenanceAlert(vehicleId: string, maintenanceType: string, dueDate: string) {
    try {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('organization_id, plate_number, mileage')
        .eq('id', vehicleId)
        .single();

      if (!vehicle) return;

      await supabase
        .from('alerts')
        .insert({
          organization_id: vehicle.organization_id,
          vehicle_id: vehicleId,
          alert_type: 'maintenance_due',
          severity: 'medium',
          title: `Maintenance Due - ${vehicle.plate_number}`,
          message: `${maintenanceType} due by ${dueDate} (Current mileage: ${vehicle.mileage})`
        });

    } catch (error) {
      console.error('Error creating maintenance alert:', error);
    }
  }

  async createPanicAlert(vehicleId: string, driverId: string, location: { lat: number, lng: number }) {
    try {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select(`
          organization_id, 
          plate_number,
          drivers(first_name, last_name, phone)
        `)
        .eq('id', vehicleId)
        .single();

      if (!vehicle) return;

      await supabase
        .from('alerts')
        .insert({
          organization_id: vehicle.organization_id,
          vehicle_id: vehicleId,
          driver_id: driverId,
          alert_type: 'panic_button',
          severity: 'critical',
          title: `PANIC ALERT - ${vehicle.plate_number}`,
          message: `Emergency button pressed by ${vehicle.drivers?.first_name} ${vehicle.drivers?.last_name}`,
          location_latitude: location.lat,
          location_longitude: location.lng
        });

      // Immediate notification for panic alerts
      this.broadcastAlert('panic_button', {
        vehicleId,
        plateNumber: vehicle.plate_number,
        driverName: `${vehicle.drivers?.first_name} ${vehicle.drivers?.last_name}`,
        driverPhone: vehicle.drivers?.phone,
        location,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error creating panic alert:', error);
    }
  }

  // Driving behavior alerts
  async createDrivingBehaviorAlert(vehicleId: string, behaviorType: 'harsh_braking' | 'rapid_acceleration', severity: number, location: { lat: number, lng: number }) {
    try {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('organization_id, plate_number, assigned_driver_id')
        .eq('id', vehicleId)
        .single();

      if (!vehicle) return;

      const alertSeverity = severity > 0.8 ? 'high' : severity > 0.5 ? 'medium' : 'low';
      const behaviorText = behaviorType === 'harsh_braking' ? 'Harsh Braking' : 'Rapid Acceleration';

      await supabase
        .from('alerts')
        .insert({
          organization_id: vehicle.organization_id,
          vehicle_id: vehicleId,
          driver_id: vehicle.assigned_driver_id,
          alert_type: behaviorType,
          severity: alertSeverity,
          title: `${behaviorText} - ${vehicle.plate_number}`,
          message: `${behaviorText} detected (Severity: ${Math.round(severity * 100)}%)`,
          location_latitude: location.lat,
          location_longitude: location.lng
        });

    } catch (error) {
      console.error('Error creating driving behavior alert:', error);
    }
  }

  // Get alerts for organization
  async getAlerts(organizationId: string, filters?: {
    severity?: string;
    alertType?: string;
    acknowledged?: boolean;
    limit?: number;
  }) {
    try {
      let query = supabase
        .from('alerts')
        .select(`
          *,
          vehicles(plate_number, make, model),
          drivers(first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters?.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }

      if (filters?.acknowledged !== undefined) {
        query = query.eq('acknowledged', filters.acknowledged);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting alerts:', error);
      throw error;
    }
  }

  // Acknowledge alert
  async acknowledgeAlert(alertId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  // Resolve alert
  async resolveAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  // Broadcast real-time alerts
  private broadcastAlert(type: string, payload: any) {
    supabase.channel('alerts')
      .send({
        type: 'broadcast',
        event: 'new_alert',
        payload: {
          type,
          ...payload,
          timestamp: new Date().toISOString()
        }
      });
  }

  // Get alert statistics
  async getAlertStatistics(organizationId: string, timeRange: 'day' | 'week' | 'month' = 'week') {
    try {
      const startDate = new Date();
      switch (timeRange) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('alerts')
        .select('alert_type, severity, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Process statistics
      const stats = {
        total: data.length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        resolved: 0,
        pending: 0
      };

      data.forEach(alert => {
        stats.byType[alert.alert_type] = (stats.byType[alert.alert_type] || 0) + 1;
        stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting alert statistics:', error);
      throw error;
    }
  }
}