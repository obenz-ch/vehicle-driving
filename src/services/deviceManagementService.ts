import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export class DeviceManagementService {
  // Register a new GPS device
  async registerDevice(deviceData: {
    device_id: string;
    imei?: string;
    device_type: 'obd' | 'hardwired' | 'battery' | 'smartphone';
    manufacturer?: string;
    model?: string;
    sim_card_number?: string;
    data_plan_provider?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('gps_devices')
        .insert({
          id: uuidv4(),
          ...deviceData,
          status: 'active',
          installation_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  // Assign device to vehicle
  async assignDeviceToVehicle(deviceId: string, vehicleId: string) {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ gps_device_id: deviceId })
        .eq('id', vehicleId);

      if (error) throw error;

      // Update device status
      await supabase
        .from('gps_devices')
        .update({ 
          status: 'active',
          installation_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', deviceId);

    } catch (error) {
      console.error('Error assigning device to vehicle:', error);
      throw error;
    }
  }

  // Monitor device health
  async updateDeviceHealth(deviceId: string, healthData: {
    battery_level?: number;
    signal_strength?: number;
    last_heartbeat?: string;
  }) {
    try {
      const { error } = await supabase
        .from('gps_devices')
        .update({
          ...healthData,
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId);

      if (error) throw error;

      // Check for low battery or poor signal alerts
      if (healthData.battery_level && healthData.battery_level < 20) {
        await this.createDeviceAlert(deviceId, 'low_battery', `Device battery at ${healthData.battery_level}%`);
      }

      if (healthData.signal_strength && healthData.signal_strength < 30) {
        await this.createDeviceAlert(deviceId, 'poor_signal', `Signal strength at ${healthData.signal_strength}%`);
      }

    } catch (error) {
      console.error('Error updating device health:', error);
      throw error;
    }
  }

  // Create device-related alerts
  private async createDeviceAlert(deviceId: string, alertType: string, message: string) {
    try {
      // Get vehicle and organization info
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('id, organization_id, plate_number')
        .eq('gps_device_id', deviceId)
        .single();

      if (!vehicle) return;

      await supabase
        .from('alerts')
        .insert({
          organization_id: vehicle.organization_id,
          vehicle_id: vehicle.id,
          alert_type: 'device_offline',
          severity: alertType === 'low_battery' ? 'medium' : 'high',
          title: `Device Alert - ${vehicle.plate_number}`,
          message: message
        });

    } catch (error) {
      console.error('Error creating device alert:', error);
    }
  }

  // Get device status and diagnostics
  async getDeviceStatus(deviceId: string) {
    try {
      const { data, error } = await supabase
        .from('gps_devices')
        .select(`
          *,
          vehicles (
            id,
            plate_number,
            make,
            model
          )
        `)
        .eq('device_id', deviceId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting device status:', error);
      throw error;
    }
  }

  // Bulk device health check
  async performHealthCheck(organizationId: string) {
    try {
      const { data: devices } = await supabase
        .from('gps_devices')
        .select(`
          *,
          vehicles!inner (
            organization_id,
            plate_number
          )
        `)
        .eq('vehicles.organization_id', organizationId);

      if (!devices) return [];

      const healthReport = devices.map(device => {
        const lastHeartbeat = device.last_heartbeat ? new Date(device.last_heartbeat) : null;
        const isOffline = lastHeartbeat ? (Date.now() - lastHeartbeat.getTime()) > 300000 : true; // 5 minutes

        return {
          device_id: device.device_id,
          vehicle_plate: device.vehicles?.plate_number,
          status: device.status,
          battery_level: device.battery_level,
          signal_strength: device.signal_strength,
          is_offline: isOffline,
          last_heartbeat: device.last_heartbeat,
          health_score: this.calculateHealthScore(device)
        };
      });

      return healthReport;
    } catch (error) {
      console.error('Error performing health check:', error);
      throw error;
    }
  }

  // Calculate device health score
  private calculateHealthScore(device: any): number {
    let score = 100;
    
    // Battery level impact
    if (device.battery_level) {
      if (device.battery_level < 20) score -= 30;
      else if (device.battery_level < 50) score -= 15;
    }

    // Signal strength impact
    if (device.signal_strength) {
      if (device.signal_strength < 30) score -= 25;
      else if (device.signal_strength < 60) score -= 10;
    }

    // Offline status impact
    const lastHeartbeat = device.last_heartbeat ? new Date(device.last_heartbeat) : null;
    if (lastHeartbeat) {
      const minutesOffline = (Date.now() - lastHeartbeat.getTime()) / 60000;
      if (minutesOffline > 60) score -= 40;
      else if (minutesOffline > 15) score -= 20;
    } else {
      score -= 50;
    }

    return Math.max(0, score);
  }

  // Remote device commands
  async sendDeviceCommand(deviceId: string, command: 'restart' | 'update_firmware' | 'change_reporting_interval', params?: any) {
    try {
      // This would integrate with the GPS provider's device management API
      const response = await fetch(`/api/devices/${deviceId}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command,
          params
        })
      });

      if (!response.ok) {
        throw new Error(`Command failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log the command in database
      await supabase
        .from('device_commands')
        .insert({
          device_id: deviceId,
          command,
          params,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

      return result;
    } catch (error) {
      console.error('Error sending device command:', error);
      throw error;
    }
  }
}