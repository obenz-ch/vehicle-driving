import { supabase } from '../lib/supabase';
import { RealGPSService } from './realGPSService';
import { v4 as uuidv4 } from 'uuid';

export interface DeviceRegistrationData {
  deviceId: string;
  imei: string;
  deviceType: 'obd' | 'hardwired' | 'battery' | 'smartphone';
  manufacturer: string;
  model: string;
  simCardNumber?: string;
  dataProvider?: string;
  vehicleId?: string;
}

export interface VehicleRegistrationData {
  vin: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number;
  color: string;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  ownerId: string;
  insurancePolicy?: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
}

export class DeviceRegistrationService {
  private gpsService: RealGPSService;

  constructor(gpsService: RealGPSService) {
    this.gpsService = gpsService;
  }

  // Register a new vehicle
  async registerVehicle(organizationId: string, vehicleData: VehicleRegistrationData): Promise<string> {
    try {
      const vehicleId = uuidv4();
      
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          id: vehicleId,
          organization_id: organizationId,
          vin: vehicleData.vin,
          plate_number: vehicleData.plateNumber,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          color: vehicleData.color,
          fuel_type: vehicleData.fuelType,
          insurance_policy: vehicleData.insurancePolicy,
          insurance_expiry: vehicleData.insuranceExpiry,
          registration_expiry: vehicleData.registrationExpiry,
          status: 'inactive' // Will be activated when device is assigned
        })
        .select()
        .single();

      if (error) throw error;

      // Create maintenance schedule
      await this.createMaintenanceSchedule(vehicleId, vehicleData);

      return vehicleId;
    } catch (error) {
      console.error('Error registering vehicle:', error);
      throw error;
    }
  }

  // Register a new GPS device
  async registerDevice(organizationId: string, deviceData: DeviceRegistrationData): Promise<string> {
    try {
      // First register with GPS provider
      const providerResponse = await this.gpsService.registerDevice({
        deviceId: deviceData.deviceId,
        imei: deviceData.imei,
        vehicleId: deviceData.vehicleId || '',
        deviceType: deviceData.deviceType,
        simCardNumber: deviceData.simCardNumber
      });

      // Then store in our database
      const deviceId = uuidv4();
      const { data, error } = await supabase
        .from('gps_devices')
        .insert({
          id: deviceId,
          device_id: deviceData.deviceId,
          imei: deviceData.imei,
          device_type: deviceData.deviceType,
          manufacturer: deviceData.manufacturer,
          model: deviceData.model,
          sim_card_number: deviceData.simCardNumber,
          data_plan_provider: deviceData.dataProvider,
          installation_date: new Date().toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return deviceId;
    } catch (error) {
      console.error('Error registering device:', error);
      throw error;
    }
  }

  // Assign device to vehicle
  async assignDeviceToVehicle(deviceId: string, vehicleId: string): Promise<void> {
    try {
      // Update vehicle with device assignment
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ 
          gps_device_id: deviceId,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (vehicleError) throw vehicleError;

      // Update device status
      const { error: deviceError } = await supabase
        .from('gps_devices')
        .update({ 
          installation_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', deviceId);

      if (deviceError) throw deviceError;

      // Set up initial geofences if any exist for the organization
      await this.setupInitialGeofences(vehicleId);

    } catch (error) {
      console.error('Error assigning device to vehicle:', error);
      throw error;
    }
  }

  // Register driver
  async registerDriver(organizationId: string, driverData: {
    employeeId?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    licenseNumber: string;
    licenseExpiry?: string;
    hireDate?: string;
  }): Promise<string> {
    try {
      const driverId = uuidv4();
      
      const { data, error } = await supabase
        .from('drivers')
        .insert({
          id: driverId,
          organization_id: organizationId,
          employee_id: driverData.employeeId,
          first_name: driverData.firstName,
          last_name: driverData.lastName,
          email: driverData.email,
          phone: driverData.phone,
          license_number: driverData.licenseNumber,
          license_expiry: driverData.licenseExpiry,
          hire_date: driverData.hireDate || new Date().toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return driverId;
    } catch (error) {
      console.error('Error registering driver:', error);
      throw error;
    }
  }

  // Assign driver to vehicle
  async assignDriverToVehicle(driverId: string, vehicleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ 
          assigned_driver_id: driverId,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error assigning driver to vehicle:', error);
      throw error;
    }
  }

  // Bulk device registration from CSV
  async bulkRegisterDevices(organizationId: string, csvData: string): Promise<{
    successful: number;
    failed: Array<{ row: number; error: string; data: any }>;
  }> {
    const results = { successful: 0, failed: [] as any[] };
    
    try {
      const lines = csvData.split('\n').slice(1); // Skip header
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const [deviceId, imei, deviceType, manufacturer, model, simCard] = line.split(',');
          
          await this.registerDevice(organizationId, {
            deviceId: deviceId.trim(),
            imei: imei.trim(),
            deviceType: deviceType.trim() as any,
            manufacturer: manufacturer.trim(),
            model: model.trim(),
            simCardNumber: simCard?.trim()
          });
          
          results.successful++;
        } catch (error) {
          results.failed.push({
            row: i + 2, // +2 for header and 0-based index
            error: error instanceof Error ? error.message : 'Unknown error',
            data: line
          });
        }
      }
    } catch (error) {
      console.error('Error in bulk registration:', error);
      throw error;
    }

    return results;
  }

  // Device activation workflow
  async activateDevice(deviceId: string): Promise<void> {
    try {
      // Send activation command to GPS provider
      await this.gpsService.sendDeviceCommand(deviceId, 'activate');

      // Update device status
      await supabase
        .from('gps_devices')
        .update({ 
          status: 'active',
          installation_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId);

      // Start monitoring device health
      this.startDeviceHealthMonitoring(deviceId);

    } catch (error) {
      console.error('Error activating device:', error);
      throw error;
    }
  }

  // Device deactivation
  async deactivateDevice(deviceId: string): Promise<void> {
    try {
      // Send deactivation command to GPS provider
      await this.gpsService.sendDeviceCommand(deviceId, 'deactivate');

      // Update device status
      await supabase
        .from('gps_devices')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId);

    } catch (error) {
      console.error('Error deactivating device:', error);
      throw error;
    }
  }

  // Private helper methods
  private async createMaintenanceSchedule(vehicleId: string, vehicleData: VehicleRegistrationData): Promise<void> {
    const maintenanceItems = [
      { type: 'oil_change', intervalMiles: 5000, description: 'Oil and filter change' },
      { type: 'tire_rotation', intervalMiles: 7500, description: 'Tire rotation and inspection' },
      { type: 'brake_service', intervalMiles: 25000, description: 'Brake system inspection' },
      { type: 'inspection', intervalMiles: 12000, description: 'Annual vehicle inspection' }
    ];

    for (const item of maintenanceItems) {
      await supabase
        .from('maintenance_records')
        .insert({
          vehicle_id: vehicleId,
          maintenance_type: item.type,
          description: item.description,
          next_service_mileage: item.intervalMiles,
          completed: false
        });
    }
  }

  private async setupInitialGeofences(vehicleId: string): Promise<void> {
    try {
      // Get organization geofences
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('organization_id')
        .eq('id', vehicleId)
        .single();

      if (!vehicle) return;

      const { data: geofences } = await supabase
        .from('geofences')
        .select('*')
        .eq('organization_id', vehicle.organization_id)
        .eq('active', true);

      if (geofences && geofences.length > 0) {
        await this.gpsService.setupGeofences(vehicleId, geofences);
      }
    } catch (error) {
      console.error('Error setting up initial geofences:', error);
    }
  }

  private startDeviceHealthMonitoring(deviceId: string): void {
    // Set up periodic health checks
    setInterval(async () => {
      try {
        const [deviceStatus] = await this.gpsService.fetchDeviceStatus([deviceId]);
        
        if (deviceStatus) {
          await supabase
            .from('gps_devices')
            .update({
              battery_level: deviceStatus.batteryLevel,
              signal_strength: deviceStatus.signalStrength,
              last_heartbeat: deviceStatus.lastHeartbeat.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('device_id', deviceId);
        }
      } catch (error) {
        console.error('Error in device health monitoring:', error);
      }
    }, 60000); // Check every minute
  }
}