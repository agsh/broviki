import { NextRequest, NextResponse } from 'next/server';
import { Discovery } from 'onvif/src';

export async function GET() {
  console.log('GET');
  const result = await Discovery.probe({
    resolve: true,
  });
  return NextResponse.json(result.map(cam => ({
    hostname: cam.hostname,
    port: cam.port,
    username: cam.username,
    password: cam.password,
    useSecure: cam.useSecure,
    useWSSecurity: cam.useWSSecurity,
    path: cam.path,
  })));
}

// Обработка POST-запроса
export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = body.name ?? 'Гость';

  return NextResponse.json({
    message: `Привет, ${name}!`,
  });
}
