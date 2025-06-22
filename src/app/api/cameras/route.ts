import { NextRequest, NextResponse } from 'next/server';

interface CameraConfig {
  id: string;
  name?: string;
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  path: string;
  useSecure: boolean;
  useWSSecurity: boolean;
  snapshotUri?: string;
}

interface UpdateCameraRequest {
  camera: CameraConfig;
}

export async function PUT(request: NextRequest) {
  try {
    const body: UpdateCameraRequest = await request.json();
    
    // Simulate some processing delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Here you would typically save to database
    // For now, we'll just simulate success
    console.log('Updating camera:', body.camera);
    
    return NextResponse.json({
      success: true,
      message: 'Camera updated successfully',
      camera: body.camera
    });
    
  } catch (error) {
    console.error('Camera update API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update camera'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Simulate retrieving cameras from database
    // For now, return empty array or saved cameras
    
    return NextResponse.json({
      success: true,
      cameras: [] // This would come from your database
    });
    
  } catch (error) {
    console.error('Camera retrieval API error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve cameras'
    }, { status: 500 });
  }
} 