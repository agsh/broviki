import { NextRequest, NextResponse } from 'next/server';
import { list } from "@/app/api/onvif";

interface ControlRequest {
  cameraId: string;
  command: 'pan' | 'tilt' | 'zoom' | 'home' | 'stop';
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  speed?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ControlRequest = await request.json();
    const { cameraId, command, direction, speed = 0.5 } = body;

    // Get the camera from the onvif cameras map
    const cameras = list();
    const onvif = cameras.get(cameraId);

    if (!onvif) {
      return NextResponse.json({
        success: false,
        message: 'Camera not found or not connected'
      }, { status: 404 });
    }

    try {
      switch (command) {
        case 'pan':
          if (direction === 'left') {
            await onvif.ptz.continuousMove({
              x: -speed,
              y: 0,
              zoom: 0
            });
          } else if (direction === 'right') {
            await onvif.ptz.continuousMove({
              x: speed,
              y: 0,
              zoom: 0
            });
          }
          break;

        case 'tilt':
          if (direction === 'up') {
            await onvif.ptz.continuousMove({
              x: 0,
              y: speed,
              zoom: 0
            });
          } else if (direction === 'down') {
            await onvif.ptz.continuousMove({
              x: 0,
              y: -speed,
              zoom: 0
            });
          }
          break;

        case 'zoom':
          if (direction === 'in') {
            await onvif.ptz.continuousMove({
              x: 0,
              y: 0,
              zoom: speed
            });
          } else if (direction === 'out') {
            await onvif.ptz.continuousMove({
              x: 0,
              y: 0,
              zoom: -speed
            });
          }
          break;

        case 'home':
          await onvif.ptz.gotoHomePosition();
          break;

        case 'stop':
          await onvif.ptz.stop();
          break;

        default:
          return NextResponse.json({
            success: false,
            message: 'Invalid command'
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `${command} command executed successfully`
      });

    } catch (ptzError) {
      console.error('PTZ command error:', ptzError);
      return NextResponse.json({
        success: false,
        message: 'Failed to execute PTZ command'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Camera control API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process control request'
    }, { status: 500 });
  }
} 