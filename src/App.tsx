import React, { useState, useEffect } from 'react';
import { MapPin, Layers, BarChart3, Settings, Plus, Activity } from 'lucide-react';
import { SearchBar } from './components/SearchBar';
import { VehicleCard } from './components/VehicleCard';
import { Map } from './components/Map';
import { VehicleDetails } from './components/VehicleDetails';
import { Dashboard } from './components/Dashboard';
import { VehicleRegistration } from './components/VehicleRegistration';
import { RealTimeMonitor } from './components/RealTimeMonitor';
import { DeviceManagement } from './components/DeviceManagement';
import { Vehicle } from './types/Vehicle';
import { mockVehicles } from './data/mockVehicles';

type ViewMode = 'dashboard' | 'map' | 'list' | 'register' | 'monitor' | 'devices';

function App() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(mockVehicles);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [organizationId] = useState('demo-org-123'); // In real app, get from auth
  const [gpsProvider] = useState('verizon'); // In real app, get from settings
  const [apiKey] = useState('demo-api-key'); // In real app, get from secure storage

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prevVehicles => 
        prevVehicles.map(vehicle => {
          if (vehicle.status === 'active') {
            // Simulate small GPS updates
            const latOffset = (Math.random() - 0.5) * 0.001;
            const lngOffset = (Math.random() - 0.5) * 0.001;
            const speedVariation = Math.floor(Math.random() * 10) - 5;
            const headingVariation = Math.floor(Math.random() * 20) - 10;
            
            return {
              ...vehicle,
              gpsCoordinates: {
                latitude: vehicle.gpsCoordinates.latitude + latOffset,
                longitude: vehicle.gpsCoordinates.longitude + lngOffset
              },
              speed: Math.max(0, vehicle.speed + speedVariation),
              heading: (vehicle.heading + headingVariation + 360) % 360,
              lastUpdate: new Date()
            };
          }
          return vehicle;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Update filtered vehicles when vehicles change
  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery, 'plate');
    } else {
      setFilteredVehicles(vehicles);
    }
  }, [vehicles, searchQuery]);

  const handleSearch = (query: string, type: 'plate' | 'gps') => {
    setIsLoading(true);
    setSearchQuery(query);
    
    // Simulate API call delay
    setTimeout(() => {
      if (type === 'plate') {
        const filtered = vehicles.filter(vehicle =>
          vehicle.plateNumber.toLowerCase().includes(query.toLowerCase()) ||
          vehicle.owner.toLowerCase().includes(query.toLowerCase()) ||
          vehicle.make.toLowerCase().includes(query.toLowerCase()) ||
          vehicle.model.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredVehicles(filtered);
      } else if (type === 'gps') {
        // Parse GPS coordinates
        const coords = query.split(',').map(c => parseFloat(c.trim()));
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          const [searchLat, searchLng] = coords;
          const filtered = vehicles.filter(vehicle => {
            const distance = Math.sqrt(
              Math.pow(vehicle.gpsCoordinates.latitude - searchLat, 2) +
              Math.pow(vehicle.gpsCoordinates.longitude - searchLng, 2)
            );
            return distance < 0.01; // Within roughly 1km
          });
          setFilteredVehicles(filtered);
        } else {
          setFilteredVehicles([]);
        }
      }
      setIsLoading(false);
    }, 500);
  };

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setViewMode('map');
  };

  const handleViewMap = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setViewMode('map');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredVehicles(vehicles);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">VehicleTracker</h1>
                <p className="text-sm text-gray-500">Real-time vehicle monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-2">
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 size={18} />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'map'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MapPin size={18} />
                  <span>Map</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Layers size={18} />
                  <span>List</span>
                </button>
                <button
                  onClick={() => setViewMode('monitor')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'monitor'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Activity size={18} />
                  <span>Live Monitor</span>
                </button>
                <button
                  onClick={() => setViewMode('register')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'register'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Plus size={18} />
                  <span>Register</span>
                </button>
                <button
                  onClick={() => setViewMode('devices')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    viewMode === 'devices'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Settings size={18} />
                  <span>Devices</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar - only show for certain views */}
        {['dashboard', 'map', 'list'].includes(viewMode) && (
          <div className="mb-8">
            <SearchBar onSearch={handleSearch} isLoading={isLoading} />
            {searchQuery && (
              <div className="flex items-center justify-center mt-4">
                <button
                  onClick={clearSearch}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear search results ({filteredVehicles.length} found)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content based on view mode */}
        {viewMode === 'dashboard' && (
          <div>
            <Dashboard vehicles={filteredVehicles} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.slice(0, 6).map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onViewMap={handleViewMap}
                />
              ))}
            </div>
          </div>
        )}

        {viewMode === 'map' && (
          <div className="relative">
            <div className="h-96 lg:h-[600px]">
              <Map
                vehicles={filteredVehicles}
                selectedVehicle={selectedVehicle}
                onVehicleSelect={handleVehicleSelect}
              />
            </div>
            {selectedVehicle && (
              <div className="absolute top-4 right-4 z-10">
                <VehicleDetails
                  vehicle={selectedVehicle}
                  onClose={() => setSelectedVehicle(null)}
                />
              </div>
            )}
          </div>
        )}

        {viewMode === 'list' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">All Vehicles</h2>
              <span className="text-sm text-gray-500">
                {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map(vehicle => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onViewMap={handleViewMap}
                />
              ))}
            </div>
          </div>
        )}

        {viewMode === 'monitor' && (
          <RealTimeMonitor
            organizationId={organizationId}
            selectedProvider={gpsProvider}
            apiKey={apiKey}
          />
        )}

        {viewMode === 'register' && (
          <VehicleRegistration
            organizationId={organizationId}
            onRegistrationComplete={() => {
              // Refresh vehicle list or show success message
              setViewMode('dashboard');
            }}
          />
        )}

        {viewMode === 'devices' && (
          <DeviceManagement organizationId={organizationId} />
        )}

        {filteredVehicles.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
            <p className="text-gray-500">
              Try adjusting your search terms or check the coordinates format.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;