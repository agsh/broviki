import { NextRequest, NextResponse } from 'next/server';
import { list, resolvePtzProfileToken } from '@/app/api/onvif';
import type { Onvif } from 'onvif/src/index.ts';

interface ControlRequest {
  cameraId: string;
  command: 'pan' | 'tilt' | 'zoom' | 'home' | 'stop';
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out';
  speed?: number;
}

type MoveCommand = 'pan' | 'tilt' | 'zoom';

function clampSpeed(speed: number): number {
  return Math.min(Math.max(speed, 0.05), 1);
}

function assertPtzReady(onvif: Onvif): string {
  if (!onvif.uri.PTZ) {
    throw new Error('Camera does not expose a PTZ service endpoint.');
  }

  const profileToken = resolvePtzProfileToken(onvif);
  const profile = onvif.media.profiles.find((p) => p.token === profileToken);
  if (!profile?.PTZConfiguration) {
    throw new Error('No media profile with PTZ configuration found.');
  }

  return profileToken;
}

function buildVelocity(
  command: MoveCommand,
  direction: ControlRequest['direction'],
  speed: number,
) {
  const v = 1.0;

  switch (command) {
    case 'pan':
      if (direction === 'left') return { x: v, y: 0, zoom: 0 };
      if (direction === 'right') return { x: -v, y: 0, zoom: 0 };
      throw new Error(`Invalid pan direction: ${direction ?? 'missing'}`);
    case 'tilt':
      if (direction === 'up') return { x: 0, y: -v, zoom: 0 };
      if (direction === 'down') return { x: 0, y: v, zoom: 0 };
      throw new Error(`Invalid tilt direction: ${direction ?? 'missing'}`);
    case 'zoom':
      if (direction === 'in') return { x: 0, y: 0, zoom: v };
      if (direction === 'out') return { x: 0, y: 0, zoom: -v };
      throw new Error(`Invalid zoom direction: ${direction ?? 'missing'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ControlRequest = await request.json();
    const { cameraId, command, direction, speed = 0.3 } = body;

    if (!cameraId) {
      return NextResponse.json(
        { success: false, message: 'cameraId is required' },
        { status: 400 },
      );
    }

    const onvif = list().get(cameraId);
    if (!onvif) {
      return NextResponse.json(
        {
          success: false,
          message: 'Camera not found or not connected. Use Connect in camera properties first.',
        },
        { status: 404 },
      );
    }

    try {
      switch (command) {
        case 'pan':
        case 'tilt':
        case 'zoom': {
          const profileToken = assertPtzReady(onvif);
          const velocity = buildVelocity(command, direction, speed);
          await onvif.ptz.continuousMove({
            profileToken,
            velocity,
            timeout: 'PT60S',
          });
          break;
        }

        case 'home': {
          const profileToken = assertPtzReady(onvif);
          await onvif.ptz.gotoHomePosition({ profileToken });
          break;
        }

        case 'stop': {
          const profileToken = onvif.activeSource?.profileToken ?? resolvePtzProfileToken(onvif);
          await onvif.ptz.stop({ profileToken, panTilt: true, zoom: true });
          break;
        }

        default:
          return NextResponse.json(
            { success: false, message: 'Invalid command' },
            { status: 400 },
          );
      }

      return NextResponse.json({
        success: true,
        message: `${command} command executed successfully`,
      });
    } catch (ptzError) {
      const message =
        ptzError instanceof Error ? ptzError.message : 'Failed to execute PTZ command';
      console.error('PTZ command error:', ptzError);
      return NextResponse.json({ success: false, message }, { status: 500 });
    }
  } catch (error) {
    console.error('Camera control API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process control request' },
      { status: 500 },
    );
  }
}
