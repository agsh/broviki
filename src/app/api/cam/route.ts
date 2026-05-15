import { NextRequest, NextResponse } from 'next/server';
import { add } from '@/app/api/onvif';

function mediaUriString(result: { uri?: string; mediaUri?: { uri?: string } } | undefined): string {
  if (!result) return '';
  return result.uri ?? result.mediaUri?.uri ?? '';
}

interface CameraRequest {
  id: string;
  name?: string;
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  path: string;
  useSecure: boolean;
  useWSSecurity: boolean;
  action: 'connect' | 'refresh';
  status: "connected" | "disconnected" | "connecting";
  message?: string;
  capabilities?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: CameraRequest = await request.json();

    if (body.action === 'connect') {
      const onvif = await add(body);

      const capabilities = onvif.defaultProfile;
      let snapshotUri = '';
      let streamUri = '';
      try {
        snapshotUri = mediaUriString(await onvif.media.getSnapshotUri());
      } catch {
        // snapshot not supported
      }
      try {
        streamUri = mediaUriString(await onvif.media.getStreamUri());
      } catch {
        // stream uri not available
      }
      return NextResponse.json({
        success: true,
        message: 'Connected successfully',
        status: 'connected',
        capabilities,
        snapshotUri,
        streamUri,
      });
    } else if (body.action === 'refresh') {
      return NextResponse.json({
        success: true,
        message: 'Camera status refreshed',
        status: Math.random() > 0.3 ? 'connected' : 'disconnected',
        lastRefresh: new Date().toISOString(),
        uptime: Math.floor(Math.random() * 86400), // Random uptime in seconds
        stats: {
          bytesReceived: Math.floor(Math.random() * 1000000),
          bytesSent: Math.floor(Math.random() * 500000),
          frameRate: Math.floor(Math.random() * 30) + 15,
          bitrate: Math.floor(Math.random() * 5000) + 1000
        }
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Unknown action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Camera API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process camera request'
    }, { status: 500 });
  }
} 