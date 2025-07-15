// GPS Provider Configuration
export interface GPSProviderConfig {
  name: string;
  baseUrl: string;
  authType: 'bearer' | 'api_key' | 'oauth';
  endpoints: {
    vehicles: string;
    locations: string;
    devices: string;
    alerts: string;
  };
}

export const GPS_PROVIDERS: Record<string, GPSProviderConfig> = {
  verizon: {
    name: 'Verizon Connect',
    baseUrl: 'https://api.verizonconnect.com/v1',
    authType: 'bearer',
    endpoints: {
      vehicles: '/vehicles',
      locations: '/locations',
      devices: '/devices',
      alerts: '/alerts'
    }
  },
  geotab: {
    name: 'Geotab',
    baseUrl: 'https://my.geotab.com/apiv1',
    authType: 'api_key',
    endpoints: {
      vehicles: '/Get/Device',
      locations: '/Get/LogRecord',
      devices: '/Get/Device',
      alerts: '/Get/ExceptionEvent'
    }
  },
  fleetComplete: {
    name: 'Fleet Complete',
    baseUrl: 'https://api.fleetcomplete.com/v1',
    authType: 'bearer',
    endpoints: {
      vehicles: '/vehicles',
      locations: '/positions',
      devices: '/devices',
      alerts: '/events'
    }
  },
  samsara: {
    name: 'Samsara',
    baseUrl: 'https://api.samsara.com/v1',
    authType: 'bearer',
    endpoints: {
      vehicles: '/fleet/vehicles',
      locations: '/fleet/vehicles/locations',
      devices: '/fleet/vehicles',
      alerts: '/fleet/alerts'
    }
  },
  teletrac: {
    name: 'Teletrac Navman',
    baseUrl: 'https://api.teletracnavman.com/v1',
    authType: 'bearer',
    endpoints: {
      vehicles: '/vehicles',
      locations: '/locations',
      devices: '/devices',
      alerts: '/alerts'
    }
  }
};

export const getProviderConfig = (provider: string): GPSProviderConfig => {
  const config = GPS_PROVIDERS[provider];
  if (!config) {
    throw new Error(`Unsupported GPS provider: ${provider}`);
  }
  return config;
};