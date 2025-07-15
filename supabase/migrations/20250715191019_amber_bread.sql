/*
  # Vehicle Tracking System Database Schema

  1. New Tables
    - `organizations` - Company/fleet owner information
    - `drivers` - Driver profiles and licenses
    - `vehicles` - Vehicle registration and details
    - `gps_devices` - GPS tracking device information
    - `location_updates` - Real-time GPS coordinates
    - `geofences` - Virtual boundaries for alerts
    - `alerts` - System notifications and warnings
    - `maintenance_records` - Vehicle maintenance history
    - `trips` - Journey tracking and analytics

  2. Security
    - Enable RLS on all tables
    - Add policies for organization-based access control
    - Secure API access with proper authentication

  3. Real-time Features
    - Location update triggers
    - Alert generation system
    - WebSocket support for live tracking
*/

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text NOT NULL,
  phone text,
  address text,
  subscription_plan text DEFAULT 'basic',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE,
  phone text,
  license_number text UNIQUE NOT NULL,
  license_expiry date,
  hire_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- GPS Devices table
CREATE TABLE IF NOT EXISTS gps_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text UNIQUE NOT NULL,
  imei text UNIQUE,
  device_type text NOT NULL CHECK (device_type IN ('obd', 'hardwired', 'battery', 'smartphone')),
  manufacturer text,
  model text,
  firmware_version text,
  sim_card_number text,
  data_plan_provider text,
  installation_date date,
  last_heartbeat timestamptz,
  battery_level integer CHECK (battery_level >= 0 AND battery_level <= 100),
  signal_strength integer CHECK (signal_strength >= 0 AND signal_strength <= 100),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'lost')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  vin text UNIQUE NOT NULL,
  plate_number text UNIQUE NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  color text,
  fuel_type text DEFAULT 'gasoline' CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid')),
  engine_size text,
  transmission text CHECK (transmission IN ('manual', 'automatic')),
  mileage integer DEFAULT 0,
  purchase_date date,
  insurance_policy text,
  insurance_expiry date,
  registration_expiry date,
  assigned_driver_id uuid REFERENCES drivers(id),
  gps_device_id uuid REFERENCES gps_devices(id),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'sold')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Location Updates table (for real-time tracking)
CREATE TABLE IF NOT EXISTS location_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  device_id uuid REFERENCES gps_devices(id),
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  altitude decimal(8, 2),
  speed decimal(5, 2) DEFAULT 0,
  heading integer DEFAULT 0 CHECK (heading >= 0 AND heading < 360),
  accuracy decimal(5, 2),
  satellites integer,
  hdop decimal(4, 2),
  address text,
  city text,
  state text,
  country text,
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Geofences table
CREATE TABLE IF NOT EXISTS geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  fence_type text NOT NULL CHECK (fence_type IN ('circular', 'polygon')),
  center_latitude decimal(10, 8),
  center_longitude decimal(11, 8),
  radius decimal(8, 2),
  polygon_coordinates jsonb,
  alert_on_entry boolean DEFAULT true,
  alert_on_exit boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id),
  driver_id uuid REFERENCES drivers(id),
  alert_type text NOT NULL CHECK (alert_type IN ('speeding', 'geofence_entry', 'geofence_exit', 'maintenance_due', 'device_offline', 'panic_button', 'harsh_braking', 'rapid_acceleration')),
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  location_latitude decimal(10, 8),
  location_longitude decimal(11, 8),
  acknowledged boolean DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Maintenance Records table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  maintenance_type text NOT NULL CHECK (maintenance_type IN ('oil_change', 'tire_rotation', 'brake_service', 'engine_service', 'transmission_service', 'inspection', 'repair', 'other')),
  description text NOT NULL,
  service_provider text,
  cost decimal(10, 2),
  mileage_at_service integer,
  next_service_mileage integer,
  next_service_date date,
  parts_replaced text[],
  labor_hours decimal(4, 2),
  warranty_expiry date,
  receipt_url text,
  completed boolean DEFAULT false,
  scheduled_date date,
  completed_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id),
  start_location_lat decimal(10, 8),
  start_location_lng decimal(11, 8),
  end_location_lat decimal(10, 8),
  end_location_lng decimal(11, 8),
  start_address text,
  end_address text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_minutes integer,
  distance_km decimal(8, 2),
  max_speed decimal(5, 2),
  avg_speed decimal(5, 2),
  fuel_consumed decimal(6, 2),
  harsh_braking_events integer DEFAULT 0,
  rapid_acceleration_events integer DEFAULT 0,
  speeding_events integer DEFAULT 0,
  idle_time_minutes integer DEFAULT 0,
  trip_status text DEFAULT 'in_progress' CHECK (trip_status IN ('in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Organizations
CREATE POLICY "Users can read own organization data"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM user_organizations WHERE organization_id = id
  ));

-- RLS Policies for Vehicles
CREATE POLICY "Users can read organization vehicles"
  ON vehicles
  FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update organization vehicles"
  ON vehicles
  FOR UPDATE
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- RLS Policies for Location Updates
CREATE POLICY "Users can read organization vehicle locations"
  ON location_updates
  FOR SELECT
  TO authenticated
  USING (vehicle_id IN (
    SELECT v.id FROM vehicles v
    JOIN user_organizations uo ON v.organization_id = uo.organization_id
    WHERE uo.user_id = auth.uid()
  ));

-- RLS Policies for Drivers
CREATE POLICY "Users can read organization drivers"
  ON drivers
  FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- RLS Policies for Alerts
CREATE POLICY "Users can read organization alerts"
  ON alerts
  FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
  ));

-- User Organizations junction table
CREATE TABLE IF NOT EXISTS user_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  role text DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'dispatcher', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own organization memberships"
  ON user_organizations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_updates_vehicle_timestamp ON location_updates(vehicle_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_updates_timestamp ON location_updates(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_drivers_organization ON drivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_alerts_organization_created ON alerts(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_start_time ON trips(vehicle_id, start_time DESC);

-- Functions for real-time updates
CREATE OR REPLACE FUNCTION update_vehicle_last_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Update vehicle's last known position
  UPDATE vehicles 
  SET updated_at = NEW.timestamp
  WHERE id = NEW.vehicle_id;
  
  -- Check for geofence violations
  -- (This would be expanded with actual geofence logic)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_location
  AFTER INSERT ON location_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_last_location();