import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClientForCurrentUser } from '@/lib/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const result = await getCalendarClientForCurrentUser();
    if ('response' in result) return result.response;
    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: 'Missing calendar event ID.' }, { status: 400 });
    await result.calendar.events.delete({ calendarId: 'primary', eventId: id, sendUpdates: 'all' });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Calendar delete failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not delete the meeting.' }, { status: 500 });
  }
}
