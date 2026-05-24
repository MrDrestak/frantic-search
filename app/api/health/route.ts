import { NextResponse } from 'next/server';
import { supabase } from '@/services/supabase';

export async function GET() {
  const { error } = await supabase.from('settings').select('key').limit(1);

  if (error) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: 'connected',
  });
}
