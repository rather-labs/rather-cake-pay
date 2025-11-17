import { NextResponse } from 'next/server';

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Rather Cake Pay API is running',
  });
}
