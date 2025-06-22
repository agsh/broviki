'use client';

import { useState } from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';

export interface CameraConfig {
  id: string;
  hostname: string;
  port?: number;
  username?: string;
  password?: string;
  useSecure: boolean;
  useWSSecurity: boolean;
  path: string;
  name?: string;
}

interface CameraFormData {
  hostname: string;
  port: string;
  username: string;
  password: string;
  useSecure: boolean;
  useWSSecurity: boolean;
  path: string;
  name: string;
}

interface CameraListProps {
  cameras: CameraConfig[];
  selectedCamera: CameraConfig | null;
  onCameraSelect: (camera: CameraConfig) => void;
  onCameraAdd: (camera: CameraConfig) => void;
  onCameraRemove: (id: string) => void;
  width: number;
}

export default function CameraList({
  cameras,
  selectedCamera,
  onCameraSelect,
  onCameraAdd,
  onCameraRemove,
  width
}: CameraListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<CameraFormData>({
    hostname: '',
    port: '',
    username: '',
    password: '',
    useSecure: false,
    useWSSecurity: false,
    path: '/onvif/device_service',
    name: '',
  });

  const handleAddCamera = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.hostname.trim()) {
      alert('Hostname is required');
      return;
    }

    const defaultPort = formData.useSecure ? 443 : 80;
    const port = formData.port ? parseInt(formData.port) : defaultPort;

    const newCamera: CameraConfig = {
      id: formData.hostname.trim() + ':' + port,
      hostname: formData.hostname.trim(),
      port,
      username: formData.username.trim() || undefined,
      password: formData.password.trim() || undefined,
      useSecure: formData.useSecure,
      useWSSecurity: formData.useWSSecurity,
      path: formData.path.trim() || '/onvif/device_service',
      name: formData.name.trim() || formData.hostname.trim(),
    };

    onCameraAdd(newCamera);
    setFormData({
      hostname: '',
      port: '',
      username: '',
      password: '',
      useSecure: false,
      useWSSecurity: false,
      path: '/onvif/device_service',
      name: '',
    });
    setShowAddForm(false);
  };

  const handleFormChange = (field: keyof CameraFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col"
      style={{ width: `${width}%` }}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Video Cameras
          </h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
            title="Add Camera"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Add Camera Form */}
        {showAddForm && (
          <form onSubmit={handleAddCamera} className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                placeholder="Camera name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hostname *
              </label>
              <input
                type="text"
                value={formData.hostname}
                onChange={(e) => handleFormChange('hostname', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                placeholder="192.168.1.100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => handleFormChange('port', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                placeholder={formData.useSecure ? "443" : "80"}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleFormChange('username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleFormChange('password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Path
              </label>
              <input
                type="text"
                value={formData.path}
                onChange={(e) => handleFormChange('path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                placeholder="/onvif/device_service"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.useSecure}
                  onChange={(e) => handleFormChange('useSecure', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Use Secure</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.useWSSecurity}
                  onChange={(e) => handleFormChange('useWSSecurity', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">WS Security</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors text-sm"
              >
                Add Camera
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Camera List */}
      <div className="flex-1 overflow-y-auto">
        {cameras.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No cameras configured</p>
            <p className="text-sm">Click the + button to add your first camera</p>
          </div>
        ) : (
          <div className="p-2">
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors border ${
                  selectedCamera?.id === camera.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
                onClick={() => onCameraSelect(camera)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {camera.name || camera.hostname}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {camera.hostname}:{camera.port}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {camera.useSecure && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs rounded">
                          Secure
                        </span>
                      )}
                      {camera.useWSSecurity && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-xs rounded">
                          WS Security
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCameraRemove(camera.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove Camera"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 