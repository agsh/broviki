'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, Wifi, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { CameraConfig } from './camera-list';

interface CameraPropertiesProps {
  camera: CameraConfig;
  height: number;
  onCameraUpdate?: (updatedCamera: CameraConfig) => void;
}

type TabType = 'general' | 'network' | 'security' | 'capabilities';

// JSON Tree Component
interface JsonTreeProps {
  data: any;
  level?: number;
}

function JsonTree({ data, level = 0 }: JsonTreeProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const renderValue = (key: string, value: any, path: string) => {
    const isExpanded = expandedKeys.has(path);
    const indent = level * 20;

    if (value === null) {
      return (
        <div style={{ marginLeft: indent }} className="flex items-center py-1">
          <span className="text-blue-600 dark:text-blue-400 font-medium">{key}:</span>
          <span className="ml-2 text-gray-500 dark:text-gray-400">null</span>
        </div>
      );
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <div key={path}>
          <div
            style={{ marginLeft: indent }}
            className="flex items-center py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
            onClick={() => toggleExpand(path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1 text-gray-400" />
            )}
            <span className="text-blue-600 dark:text-blue-400 font-medium">{key}:</span>
            <span className="ml-2 text-gray-500 dark:text-gray-400">
              {`{${Object.keys(value).length} ${Object.keys(value).length === 1 ? 'property' : 'properties'}}`}
            </span>
          </div>
          {isExpanded && (
            <div>
              {Object.entries(value).map(([k, v]) => renderValue(k, v, `${path}.${k}`))}
            </div>
          )}
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div key={path}>
          <div
            style={{ marginLeft: indent }}
            className="flex items-center py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded"
            onClick={() => toggleExpand(path)}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1 text-gray-400" />
            )}
            <span className="text-blue-600 dark:text-blue-400 font-medium">{key}:</span>
            <span className="ml-2 text-gray-500 dark:text-gray-400">
              [{value.length} {value.length === 1 ? 'item' : 'items'}]
            </span>
          </div>
          {isExpanded && (
            <div>
              {value.map((item, index) => renderValue(`${index}`, item, `${path}[${index}]`))}
            </div>
          )}
        </div>
      );
    }

    // Primitive values
    const valueColor = typeof value === 'string' 
      ? 'text-green-600 dark:text-green-400' 
      : typeof value === 'number' 
      ? 'text-purple-600 dark:text-purple-400'
      : typeof value === 'boolean'
      ? 'text-orange-600 dark:text-orange-400'
      : 'text-gray-600 dark:text-gray-400';

    return (
      <div key={path} style={{ marginLeft: indent }} className="flex items-center py-1">
        <span className="text-blue-600 dark:text-blue-400 font-medium">{key}:</span>
        <span className={`ml-2 ${valueColor}`}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  };

  if (!data) return null;

  return (
    <div className="font-mono text-sm">
      {Object.entries(data).map(([key, value]) => renderValue(key, value, key))}
    </div>
  );
}

const tabs = [
  { id: 'general' as TabType, label: 'General' },
  { id: 'network' as TabType, label: 'Network' },
  { id: 'security' as TabType, label: 'Security' },
  { id: 'capabilities' as TabType, label: 'Capabilities' },
];

export default function CameraProperties({ camera, height, onCameraUpdate }: CameraPropertiesProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [editedCamera, setEditedCamera] = useState<CameraConfig>(camera);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Reset tab when switching cameras
    setActiveTab(!camera?.password ? 'security' : 'general');
  }, [camera?.id]);

  // Update editedCamera when camera prop changes
  useEffect(() => {
    // Reset camera status when switching cameras
    setEditedCamera(camera);
  }, [camera]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  const handleFieldChange = async (field: keyof CameraConfig, value: any) => {
    const updated = { ...editedCamera, [field]: value };
    setEditedCamera(updated);
    
    // Update the parent component immediately for UI responsiveness
    onCameraUpdate?.(updated);

    // Debounce server updates to avoid too many requests
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }
    saveTimeout.current = setTimeout(async () => {
      await saveToServer(updated);
    }, 1000);
  };

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const saveToServer = async (camera: CameraConfig) => {
    try {
      const response = await fetch('/api/cameras', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ camera }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Camera updated successfully');
      } else {
        console.error('Failed to update camera:', result.message);
      }
    } catch (error) {
      console.error('Error saving camera:', error);
    }
  };

  const handleAction = async (action: 'connect' | 'refresh') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editedCamera,
          action
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const updatedCamera = {
          ...editedCamera,
          capabilities: result.capabilities,
          snapshotUri: result.snapshotUri,
          status: result.status,
          message: result.message,
        };
        setEditedCamera(updatedCamera);
        // Update the parent component immediately for UI responsiveness
        onCameraUpdate?.(updatedCamera);

        // Switch to capabilities tab if we received capabilities data
        if (action === 'connect' && result.capabilities) {
          setActiveTab('capabilities');
        }
      } else {
        setEditedCamera({
          ...editedCamera,
          status: 'disconnected',
          message: result.message || 'Action failed'
        });
      }
    } catch (error) {
      setEditedCamera({
        ...editedCamera,
        status: 'disconnected',
        message: 'Network error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col"
      style={{ height: `${height}%` }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Camera Properties</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            editedCamera.status === 'connected' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
            editedCamera.status === 'connecting' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
            'bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              editedCamera.status === 'connected' ? 'bg-green-500' :
              editedCamera.status === 'connecting' ? 'bg-yellow-500' :
              'bg-gray-400'
            }`} />
            {editedCamera.status === 'connecting' ? 'Connecting...' : editedCamera.status}
          </div>
          
          <button
            onClick={() => handleAction('connect')}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm rounded-md transition-colors"
          >
            <Wifi className="w-4 h-4" />
            Connect
          </button>
          
          <button
            onClick={() => handleAction('refresh')}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white text-sm rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Status Message */}
      {editedCamera.message && (
        <div className={`px-4 py-2 text-sm border-b border-gray-200 dark:border-gray-700 ${
            editedCamera.status === 'connected' ? 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-400' :
          'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-400'
        }`}>
          {editedCamera.message}
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.id === 'capabilities' && editedCamera.capabilities && (
              <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full inline-block" />
            )}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'general' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={editedCamera.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={editedCamera.hostname}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ID
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white">
                {editedCamera.id}
              </div>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stream URL
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white break-all">
                {editedCamera.useSecure ? 'https' : 'http'}://{editedCamera.hostname}:{editedCamera.port}{editedCamera.path}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'network' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hostname
              </label>
              <input
                type="text"
                value={editedCamera.hostname}
                onChange={(e) => handleFieldChange('hostname', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Port
              </label>
              <input
                type="number"
                value={editedCamera.port}
                onChange={(e) => handleFieldChange('port', parseInt(e.target.value) || 80)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Path
              </label>
              <input
                type="text"
                value={editedCamera.path}
                onChange={(e) => handleFieldChange('path', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Protocol
              </label>
              <select
                value={editedCamera.useSecure ? 'https' : 'http'}
                onChange={(e) => handleFieldChange('useSecure', e.target.value === 'https')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <div className="px-3 py-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  editedCamera.status === 'connected' ? 'bg-green-100 dark:bg-green-700 text-green-600 dark:text-green-400' :
                  editedCamera.status === 'connecting' ? 'bg-yellow-100 dark:bg-yellow-700 text-yellow-600 dark:text-yellow-400' :
                  'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}>
                  {editedCamera.status === 'connecting' ? 'Connecting...' : editedCamera.status}
                </span>
              </div>
            </div>
            
            {editedCamera.stats && (
              <div className="col-span-2 grid grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Frame Rate</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{editedCamera.stats.frameRate} fps</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Bitrate</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{editedCamera.stats.bitrate} kbps</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Bytes Received</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{editedCamera.stats.bytesReceived.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Bytes Sent</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{editedCamera.stats.bytesSent.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'security' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username {!editedCamera.username && <span className="text-xs text-gray-500 dark:text-gray-400">(please fill this field)</span>}
              </label>
              <input
                type="text"
                value={editedCamera.username || ''}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password {!editedCamera.password && <span className="text-xs text-gray-500 dark:text-gray-400">(please fill this field)</span>}
              </label>
              <input
                type="password"
                value={editedCamera.password || ''}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={editedCamera.useSecure}
                  onChange={(e) => handleFieldChange('useSecure', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                Use HTTPS
              </label>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={editedCamera.useWSSecurity || false}
                  onChange={(e) => handleFieldChange('useWSSecurity', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                WS Security
              </label>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Security Features
              </label>
              <div className="flex gap-2 flex-wrap">
                {editedCamera.useSecure && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-sm rounded-full">
                    HTTPS Enabled
                  </span>
                )}
                {editedCamera.useWSSecurity && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 text-sm rounded-full">
                    WS Security
                  </span>
                )}
                {!editedCamera.useSecure && !editedCamera.useWSSecurity && (
                  <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 text-sm rounded-full">
                    Basic Security
                  </span>
                )}
              </div>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Authentication Method
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white">
                {editedCamera.username ? 'Basic Authentication' : 'No Authentication'}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'capabilities' && (
          <div>
            {editedCamera.capabilities ? (
              <div>
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-1">
                    Camera Capabilities
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Discovered capabilities from the connected camera. Click to expand/collapse sections.
                  </p>
                  {editedCamera.lastRefresh && (
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      Last updated: {new Date(editedCamera.lastRefresh).toLocaleString()}
                    </p>
                  )}
                </div>
                <JsonTree data={editedCamera.capabilities} />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">No capabilities data available</p>
                <p className="text-xs">Connect to the camera to discover its capabilities</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 