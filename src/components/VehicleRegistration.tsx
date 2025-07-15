import React, { useState } from 'react';
import { DeviceRegistrationService } from '../services/deviceRegistrationService';
import { RealGPSService } from '../services/realGPSService';
import { Car, Smartphone, Plus, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface VehicleRegistrationProps {
  organizationId: string;
  onRegistrationComplete?: () => void;
}

export const VehicleRegistration: React.FC<VehicleRegistrationProps> = ({
  organizationId,
  onRegistrationComplete
}) => {
  const [activeTab, setActiveTab] = useState<'vehicle' | 'device' | 'driver' | 'bulk'>('vehicle');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const gpsService = new RealGPSService('verizon', process.env.VITE_GPS_API_KEY || 'demo-key');
  const registrationService = new DeviceRegistrationService(gpsService);

  // Vehicle registration form
  const VehicleForm = () => {
    const [formData, setFormData] = useState({
      vin: '',
      plateNumber: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '',
      fuelType: 'gasoline',
      ownerId: '',
      insurancePolicy: '',
      insuranceExpiry: '',
      registrationExpiry: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMessage(null);

      try {
        const vehicleId = await registrationService.registerVehicle(organizationId, formData);
        setMessage({ type: 'success', text: `Vehicle registered successfully! ID: ${vehicleId}` });
        
        // Reset form
        setFormData({
          vin: '',
          plateNumber: '',
          make: '',
          model: '',
          year: new Date().getFullYear(),
          color: '',
          fuelType: 'gasoline',
          ownerId: '',
          insurancePolicy: '',
          insuranceExpiry: '',
          registrationExpiry: ''
        });

        if (onRegistrationComplete) onRegistrationComplete();
      } catch (error) {
        setMessage({ type: 'error', text: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VIN Number *
            </label>
            <input
              type="text"
              value={formData.vin}
              onChange={(e) => setFormData({...formData, vin: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              maxLength={17}
              placeholder="1HGBH41JXMN109186"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Plate *
            </label>
            <input
              type="text"
              value={formData.plateNumber}
              onChange={(e) => setFormData({...formData, plateNumber: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="ABC-123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Make *
            </label>
            <input
              type="text"
              value={formData.make}
              onChange={(e) => setFormData({...formData, make: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Toyota"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model *
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="Camry"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year *
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              min="1900"
              max={new Date().getFullYear() + 1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({...formData, color: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Silver"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuel Type
            </label>
            <select
              value={formData.fuelType}
              onChange={(e) => setFormData({...formData, fuelType: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gasoline">Gasoline</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Insurance Policy
            </label>
            <input
              type="text"
              value={formData.insurancePolicy}
              onChange={(e) => setFormData({...formData, insurancePolicy: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Policy number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Insurance Expiry
            </label>
            <input
              type="date"
              value={formData.insuranceExpiry}
              onChange={(e) => setFormData({...formData, insuranceExpiry: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Expiry
            </label>
            <input
              type="date"
              value={formData.registrationExpiry}
              onChange={(e) => setFormData({...formData, registrationExpiry: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <Car className="h-5 w-5" />
              <span>Register Vehicle</span>
            </>
          )}
        </button>
      </form>
    );
  };

  // Device registration form
  const DeviceForm = () => {
    const [formData, setFormData] = useState({
      deviceId: '',
      imei: '',
      deviceType: 'obd',
      manufacturer: '',
      model: '',
      simCardNumber: '',
      dataProvider: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMessage(null);

      try {
        const deviceId = await registrationService.registerDevice(organizationId, formData);
        setMessage({ type: 'success', text: `Device registered successfully! ID: ${deviceId}` });
        
        // Reset form
        setFormData({
          deviceId: '',
          imei: '',
          deviceType: 'obd',
          manufacturer: '',
          model: '',
          simCardNumber: '',
          dataProvider: ''
        });

        if (onRegistrationComplete) onRegistrationComplete();
      } catch (error) {
        setMessage({ type: 'error', text: `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device ID *
            </label>
            <input
              type="text"
              value={formData.deviceId}
              onChange={(e) => setFormData({...formData, deviceId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              placeholder="DEV001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IMEI Number *
            </label>
            <input
              type="text"
              value={formData.imei}
              onChange={(e) => setFormData({...formData, imei: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              maxLength={15}
              placeholder="123456789012345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device Type *
            </label>
            <select
              value={formData.deviceType}
              onChange={(e) => setFormData({...formData, deviceType: e.target.value as any})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="obd">OBD-II Port</option>
              <option value="hardwired">Hardwired</option>
              <option value="battery">Battery Powered</option>
              <option value="smartphone">Smartphone App</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manufacturer
            </label>
            <input
              type="text"
              value={formData.manufacturer}
              onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Verizon"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="VT200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SIM Card Number
            </label>
            <input
              type="text"
              value={formData.simCardNumber}
              onChange={(e) => setFormData({...formData, simCardNumber: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="89012345678901234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Provider
            </label>
            <input
              type="text"
              value={formData.dataProvider}
              onChange={(e) => setFormData({...formData, dataProvider: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Verizon Wireless"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <>
              <Smartphone className="h-5 w-5" />
              <span>Register Device</span>
            </>
          )}
        </button>
      </form>
    );
  };

  // Bulk registration form
  const BulkForm = () => {
    const [csvData, setCsvData] = useState('');
    const [results, setResults] = useState<any>(null);

    const handleBulkSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMessage(null);
      setResults(null);

      try {
        const bulkResults = await registrationService.bulkRegisterDevices(organizationId, csvData);
        setResults(bulkResults);
        setMessage({ 
          type: 'success', 
          text: `Bulk registration completed: ${bulkResults.successful} successful, ${bulkResults.failed.length} failed` 
        });
      } catch (error) {
        setMessage({ type: 'error', text: `Bulk registration failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">CSV Format</h4>
          <p className="text-sm text-blue-700 mb-2">
            Upload a CSV file with the following columns:
          </p>
          <code className="text-xs bg-blue-100 px-2 py-1 rounded">
            device_id,imei,device_type,manufacturer,model,sim_card_number
          </code>
        </div>

        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSV Data
            </label>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={10}
              placeholder="device_id,imei,device_type,manufacturer,model,sim_card_number
DEV001,123456789012345,obd,Verizon,VT200,89012345678901234567
DEV002,123456789012346,hardwired,Geotab,GO9,89012345678901234568"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !csvData.trim()}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Bulk Register Devices</span>
              </>
            )}
          </button>
        </form>

        {results && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-4">Registration Results</h4>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">Successful</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{results.successful}</p>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900">Failed</span>
                </div>
                <p className="text-2xl font-bold text-red-900">{results.failed.length}</p>
              </div>
            </div>

            {results.failed.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Failed Registrations</h5>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {results.failed.map((failure: any, index: number) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      Row {failure.row}: {failure.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Vehicle & Device Registration</h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'vehicle', label: 'Vehicle', icon: Car },
          { id: 'device', label: 'Device', icon: Smartphone },
          { id: 'bulk', label: 'Bulk Import', icon: Upload }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div>
        {activeTab === 'vehicle' && <VehicleForm />}
        {activeTab === 'device' && <DeviceForm />}
        {activeTab === 'bulk' && <BulkForm />}
      </div>
    </div>
  );
};