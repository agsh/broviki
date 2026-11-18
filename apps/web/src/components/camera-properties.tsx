'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Cast,
  ShieldUser,
  MemoryStick,
  BellElectric,
  Info,
} from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { CameraConfig, type CameraDeviceInfo } from './camera-list';
import { getApiOrigin } from '../lib/api-origin';

interface CameraPropertiesProps {
  camera: CameraConfig;
  height: number;
  onCameraUpdate?: (updatedCamera: CameraConfig) => void;
}

type TabType = 'general' | 'info' | 'network' | 'security' | 'capabilities' | 'events';

type CameraEventItem = { name: string; value: string };

type CameraEventRecord = {
  id: string;
  seq: number;
  receivedAt: string;
  topic?: string;
  utcTime?: string;
  propertyOperation?: string;
  source: CameraEventItem[];
  data: CameraEventItem[];
  key: CameraEventItem[];
};

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
  { id: 'info' as TabType, label: 'Info' },
  { id: 'network' as TabType, label: 'Network' },
  { id: 'security' as TabType, label: 'Security' },
  { id: 'capabilities' as TabType, label: 'Capabilities' },
  { id: 'events' as TabType, label: 'Events' },
];

function formatEventItems(items: CameraEventItem[]) {
  if (!items.length) return null;
  return items.map((item) => `${item.name}=${item.value}`).join(', ');
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 break-all dark:bg-gray-700 dark:text-white">
        {value ? value : '—'}
      </div>
    </div>
  );
}

function DeviceInfoPanel({ info }: { info?: CameraDeviceInfo }) {
  if (!info) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        <Info className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p className="mb-1 text-sm font-medium">No device info yet</p>
        <p className="text-xs">Connect to the camera to load ONVIF identity and scopes</p>
      </div>
    );
  }

  const services = info.supportedServices ?? [];
  const profiles = info.supportedProfiles ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InfoField label="Manufacturer" value={info.manufacturer} />
        <InfoField label="Model" value={info.model} />
        <InfoField label="Firmware" value={info.firmware} />
        <InfoField label="Serial number" value={info.serialNumber} />
        <InfoField label="Hardware ID" value={info.hardwareId} />
        <InfoField label="Name" value={info.name} />
        <InfoField label="Location" value={info.location} />
        <InfoField label="hardware" value={info.hardware} />
        <InfoField label="Profile" value={info.profile} />
        <InfoField label="type" value={info.type} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Supported profiles:
        </label>
        {profiles.length ? (
          <div className="flex flex-wrap gap-1.5">
            {profiles.map((profile) => (
              <span
                key={profile}
                className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {profile}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:bg-gray-700 dark:text-white">
            —
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Supported services:
        </label>
        {services.length ? (
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-md border border-gray-200 dark:divide-gray-600 dark:border-gray-600">
            {services.map((service) => (
              <li
                key={`${service.name}:${service.namespace}`}
                className="bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700/50"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {service.name}
                  {service.version ? (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                      v{service.version}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 break-all font-mono text-xs text-gray-500 dark:text-gray-400">
                  {service.namespace}
                </div>
                {service.xaddr ? (
                  <div className="mt-0.5 break-all text-xs text-gray-500 dark:text-gray-400">
                    {service.xaddr}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:bg-gray-700 dark:text-white">
            —
          </div>
        )}
      </div>
    </div>
  );
}

export default function CameraProperties({ camera, height, onCameraUpdate }: CameraPropertiesProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [editedCamera, setEditedCamera] = useState<CameraConfig>(camera);
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<CameraEventRecord[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventsListening, setEventsListening] = useState(false);
  const [eventsSubscribed, setEventsSubscribed] = useState(false);
  const [eventsListenerCount, setEventsListenerCount] = useState(0);
  const eventsSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Reset tab when switching cameras
    setActiveTab(!camera?.password ? 'security' : 'general');
    setEvents([]);
    setEventsError(null);
    setEventsListening(false);
    setEventsSubscribed(false);
    setEventsListenerCount(0);
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

  // WebSocket: listen only while the Events tab is open (drives ONVIF pull-point refcount).
  useEffect(() => {
    if (activeTab !== 'events' || !editedCamera.id) {
      setEventsListening(false);
      setEventsSubscribed(false);
      return;
    }

    const cameraId = editedCamera.id;
    let cancelled = false;

    const socket = io(`${getApiOrigin()}/camera-events`, {
      transports: ['websocket'],
      withCredentials: true,
    });
    eventsSocketRef.current = socket;

    const applyStatus = (payload: {
      connected?: boolean;
      subscribed?: boolean;
      listenerCount?: number;
      lastError?: string | null;
    }) => {
      if (cancelled) return;
      setEventsListening(Boolean(payload.connected));
      setEventsSubscribed(Boolean(payload.subscribed));
      if (typeof payload.listenerCount === 'number') {
        setEventsListenerCount(payload.listenerCount);
      }
      setEventsError(payload.lastError ?? null);
    };

    socket.on('connect', () => {
      socket.emit(
        'subscribe',
        { cameraId },
        (ack: {
          success?: boolean;
          message?: string;
          connected?: boolean;
          subscribed?: boolean;
          listenerCount?: number;
          lastError?: string;
          events?: CameraEventRecord[];
        }) => {
          if (cancelled) return;
          if (!ack?.success) {
            setEventsError(ack?.message || 'Failed to subscribe to events');
            return;
          }
          applyStatus(ack);
          if (Array.isArray(ack.events)) {
            setEvents(ack.events.length > 300 ? ack.events.slice(-300) : ack.events);
          }
        },
      );
    });

    socket.on('event', (payload: { event?: CameraEventRecord; listenerCount?: number }) => {
      if (cancelled || !payload?.event) return;
      if (typeof payload.listenerCount === 'number') {
        setEventsListenerCount(payload.listenerCount);
      }
      setEvents((prev) => {
        if (prev.some((item) => item.id === payload.event!.id)) return prev;
        const merged = [...prev, payload.event!];
        return merged.length > 300 ? merged.slice(merged.length - 300) : merged;
      });
    });

    socket.on(
      'status',
      (payload: {
        connected?: boolean;
        subscribed?: boolean;
        listenerCount?: number;
        lastError?: string | null;
      }) => {
        applyStatus(payload);
      },
    );

    socket.on('cleared', (payload: { listenerCount?: number; lastError?: string | null }) => {
      if (cancelled) return;
      setEvents([]);
      setEventsError(payload?.lastError ?? null);
      if (typeof payload?.listenerCount === 'number') {
        setEventsListenerCount(payload.listenerCount);
      }
    });

    socket.on('connect_error', (error: Error) => {
      if (!cancelled) {
        setEventsError(error.message || 'WebSocket connection failed');
        setEventsListening(false);
        setEventsSubscribed(false);
      }
    });

    return () => {
      cancelled = true;
      socket.emit('unsubscribe', { cameraId });
      socket.removeAllListeners();
      socket.disconnect();
      if (eventsSocketRef.current === socket) {
        eventsSocketRef.current = null;
      }
    };
  }, [activeTab, editedCamera.id]);

  const handleClearEvents = () => {
    const socket = eventsSocketRef.current;
    if (socket?.connected) {
      socket.emit('clear', { cameraId: editedCamera.id }, () => {
        setEvents([]);
        setEventsError(null);
      });
      return;
    }

    void fetch(`/api/cam/${encodeURIComponent(editedCamera.id)}/events`, {
      method: 'DELETE',
    })
      .then(() => {
        setEvents([]);
        setEventsError(null);
      })
      .catch((error) => {
        console.error('Failed to clear events:', error);
      });
  };

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

  const handleSelectProfile = async (profileToken: string) => {
    if (!profileToken || profileToken === editedCamera.profileToken) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/cam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editedCamera,
          action: 'selectProfile',
          profileToken,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        alert(result.message || 'Failed to select profile');
        return;
      }

      const updatedCamera: CameraConfig = {
        ...editedCamera,
        profileToken: result.profileToken,
        profiles: result.profiles ?? editedCamera.profiles,
        streamUri: result.streamUri ?? editedCamera.streamUri,
        snapshotUri: result.snapshotUri ?? editedCamera.snapshotUri,
        capabilities: result.capabilities ?? editedCamera.capabilities,
        status: result.status ?? editedCamera.status,
        message: result.message,
      };
      setEditedCamera(updatedCamera);
      onCameraUpdate?.(updatedCamera);
    } catch (error) {
      console.error('Profile select error:', error);
      alert('Failed to select profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'connect' | 'disconnect' | 'refresh') => {
    setIsLoading(true);
    if (action === 'connect') {
      const connecting: CameraConfig = {
        ...editedCamera,
        status: 'connecting',
        message: undefined,
      };
      setEditedCamera(connecting);
      // So VideoWindow can show loading and start WHEP as soon as status becomes connected.
      onCameraUpdate?.(connecting);
    }
    try {
      const response = await fetch('/api/cam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editedCamera,
          action,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const updatedCamera: CameraConfig = {
          ...editedCamera,
          ...(action === 'disconnect'
            ? { deviceInfo: undefined }
            : {
                capabilities: result.capabilities ?? editedCamera.capabilities,
                deviceInfo: result.deviceInfo ?? editedCamera.deviceInfo,
                snapshotUri: result.snapshotUri ?? editedCamera.snapshotUri,
                streamUri: result.streamUri ?? editedCamera.streamUri,
                profileToken: result.profileToken ?? editedCamera.profileToken,
                profiles: result.profiles ?? editedCamera.profiles,
              }),
          status: result.status ?? (action === 'disconnect' ? 'disconnected' : editedCamera.status),
          message: result.message,
        };
        setEditedCamera(updatedCamera);
        onCameraUpdate?.(updatedCamera);

        if (action === 'connect' && result.deviceInfo) {
          setActiveTab('info');
        } else if (action === 'connect' && result.capabilities) {
          setActiveTab('capabilities');
        }
      } else {
        setEditedCamera({
          ...editedCamera,
          status: action === 'connect' ? 'disconnected' : editedCamera.status,
          message: result.message || 'Action failed',
        });
      }
    } catch {
      setEditedCamera({
        ...editedCamera,
        status: action === 'connect' ? 'disconnected' : editedCamera.status,
        message: 'Network error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const niceIcon = () => {
    switch (activeTab) {
      case 'info':
        return <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      case 'network':
        return <Cast className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      case 'security':
        return <ShieldUser className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      case 'events':
        return <BellElectric className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      case 'capabilities':
        return <MemoryStick className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      default:
        return <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col"
      style={{ height: `${height}%` }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {niceIcon()}
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

          {editedCamera.status === 'connected' ? (
            <button
              type="button"
              onClick={() => void handleAction('disconnect')}
              disabled={isLoading}
              className="flex items-center gap-1 rounded-md bg-red-500 px-3 py-1 text-sm text-white transition-colors hover:bg-red-600 disabled:bg-red-300"
            >
              <WifiOff className="h-4 w-4" />
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleAction('connect')}
              disabled={isLoading || editedCamera.status === 'connecting'}
              className="flex items-center gap-1 rounded-md bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600 disabled:bg-blue-300"
            >
              <Wifi className="h-4 w-4" />
              Connect
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleAction('refresh')}
            disabled={isLoading}
            className="flex items-center gap-1 rounded-md bg-gray-500 px-3 py-1 text-sm text-white transition-colors hover:bg-gray-600 disabled:bg-gray-300"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
            {tab.id === 'info' && editedCamera.deviceInfo && (
              <span className="ml-1 inline-block h-2 w-2 rounded-full bg-blue-500" />
            )}
            {tab.id === 'capabilities' && editedCamera.capabilities && (
              <span className="ml-1 h-2 w-2 inline-block rounded-full bg-blue-500" />
            )}
            {tab.id === 'events' && events.length > 0 && (
              <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {events.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'info' && <DeviceInfoPanel info={editedCamera.deviceInfo} />}

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
                ONVIF URL
              </label>
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white break-all">
                {editedCamera.useSecure ? 'https' : 'http'}://{editedCamera.hostname}:
                {editedCamera.port}
                {editedCamera.path}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Media profile
              </label>
              {(editedCamera.profiles?.length ?? 0) > 0 ? (
                <select
                  value={editedCamera.profileToken || ''}
                  disabled={isLoading || editedCamera.status !== 'connected'}
                  onChange={(e) => {
                    void handleSelectProfile(e.target.value);
                  }}
                  title={
                    editedCamera.status !== 'connected'
                      ? 'Connect the camera to change media profile'
                      : undefined
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                >
                  {editedCamera.profiles!.map((profile) => {
                    const res =
                      profile.width && profile.height
                        ? `${profile.width}×${profile.height}`
                        : undefined;
                    const bits = [
                      profile.name,
                      profile.encoding,
                      res,
                      profile.frameRate ? `${profile.frameRate} fps` : undefined,
                      profile.hasPtz ? 'PTZ' : undefined,
                    ]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <option key={profile.token} value={profile.token}>
                        {bits}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm text-gray-500 dark:text-gray-400">
                  Connect to load ONVIF media profiles
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stream URL
              </label>
              <input
                type="text"
                value={editedCamera.streamUri || ''}
                onChange={(e) => handleFieldChange('streamUri', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 break-all"
                placeholder="rtsp://192.168.0.148:5554/... — Connect or paste manually"
              />
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

        {activeTab === 'events' && (
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-400">
                  ONVIF events
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-300">
                  {eventsListenerCount > 0
                    ? eventsSubscribed
                      ? `WebSocket · ${eventsListenerCount} listener${eventsListenerCount === 1 ? '' : 's'} · ONVIF pull-point active`
                      : eventsListening
                        ? `WebSocket · ${eventsListenerCount} listener${eventsListenerCount === 1 ? '' : 's'} · starting pull-point…`
                        : `WebSocket · ${eventsListenerCount} listener${eventsListenerCount === 1 ? '' : 's'} · connect the camera to start pull-point`
                    : 'Connecting WebSocket…'}
                </p>
                {eventsError ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {eventsError}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleClearEvents()}
                disabled={events.length === 0}
                className="rounded-md bg-white px-3 py-1 text-xs text-blue-700 ring-1 ring-blue-200 transition-colors hover:bg-blue-100 disabled:opacity-40 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800"
              >
                Clear
              </button>
            </div>

            {events.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-sm font-medium mb-1">No events yet</p>
                <p className="text-xs">
                  {eventsSubscribed
                    ? 'Waiting for notifications from the camera…'
                    : editedCamera.status === 'connected'
                      ? 'Subscribed — pull-point should start shortly…'
                      : 'Connect the camera while this tab is open to start receiving events.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {[...events].reverse().map((event) => {
                  const source = formatEventItems(event.source);
                  const data = formatEventItems(event.data);
                  const key = formatEventItems(event.key);
                  const when = event.utcTime || event.receivedAt;

                  return (
                    <li
                      key={event.id}
                      className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-600 dark:bg-gray-700/50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs text-gray-900 dark:text-white break-all">
                          {event.topic || '(no topic)'}
                        </span>
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {when ? new Date(when).toLocaleString() : '—'}
                        </span>
                      </div>
                      {event.propertyOperation ? (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          {event.propertyOperation}
                        </p>
                      ) : null}
                      {source ? (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          source: {source}
                        </p>
                      ) : null}
                      {data ? (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          data: {data}
                        </p>
                      ) : null}
                      {key ? (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                          key: {key}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
