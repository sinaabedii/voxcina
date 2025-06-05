import { NextResponse } from 'next/server';
// @ts-ignore: missing type declarations for sms-typescript
import { Smsir } from 'sms-typescript/lib';
import codeStore from '@/lib/otp-store';

// Initialize SMS.ir client with AccessKey and LineNumber from env
const smsClient = new Smsir(
  process.env.SMSIR_ACCESS_KEY || '',
  Number(process.env.SMSIR_LINE_NUMBER || '0')
);
const templateId = Number(process.env.SMSIR_TEMPLATE_ID || '0');

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 });
    }
    // Generate a 6-digit OTP and store it
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codeStore.set(phone, code);
    // Send verification code via SMS.ir
    await smsClient.SendVerifyCode(phone, templateId, [
      { name: 'code', value: code }
    ]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('send-otp error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
} 