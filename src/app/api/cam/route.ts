import { NextRequest, NextResponse } from 'next/server';
import { add } from "@/app/api/onvif";

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
      const snapshot = await onvif.media.getSnapshotUri();
      return NextResponse.json({
        success: true,
        message: 'Connected successfully',
        status: 'connected',
        capabilities,
        snapshotUri: snapshot.uri,
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