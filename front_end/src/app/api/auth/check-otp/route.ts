import { NextResponse } from 'next/server';
import codeStore from '@/lib/otp-store';

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });
    }
    // Verify the OTP code from in-memory store
    const stored = codeStore.get(phone);
    if (!stored || stored !== code) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 });
    }
    // Code is valid, remove it to prevent reuse
    codeStore.delete(phone);
    
    // Code is valid; forward to Go backend to issue tokens
    const backendUrl = process.env.GO_BACKEND_URL;
    const goResponse = await fetch(`${backendUrl}/api/users/login-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const goData = await goResponse.json();
    // Return Go response directly
    return NextResponse.json(goData, { status: goResponse.status });
  } catch (error: any) {
    console.error('check-otp error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
} 