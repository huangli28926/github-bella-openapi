import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      code: 410,
      message: '请改用 /api/console/userInfo',
      data: null,
    },
    { status: 410 }
  );
}
