import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClientForCurrentUser } from '@/lib/google-calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const result = await getCalendarClientForCurrentUser();
    if ('response' in result) return result.response;
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get('timeMin') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const timeMax = searchParams.get('timeMax') || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
    const response = await result.calendar.events.list({ calendarId: 'primary', timeMin, timeMax, singleEvents: true, orderBy: 'startTime', maxResults: 250 });
    const events = (response.data.items || []).map((event) => ({
      id: event.id || '', summary: event.summary || '(No title)', description: event.description || '',
      start: event.start?.dateTime || event.start?.date || '', end: event.end?.dateTime || event.end?.date || '',
      location: event.location || '', htmlLink: event.htmlLink || '', attendees: (event.attendees || []).map((a) => a.email).filter((v): v is string => Boolean(v)),
    }));
    return NextResponse.json({ connected: true, events });
  } catch (error) {
    console.error('Google Calendar list failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not load Google Calendar events.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await getCalendarClientForCurrentUser();
    if ('response' in result) return result.response;
    const body = await request.json();
    const summary = String(body.summary || '').trim();
    const start = String(body.start || '');
    const end = String(body.end || '');
    if (!summary || !start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) {
      return NextResponse.json({ error: 'Enter a meeting title and valid start/end times.' }, { status: 400 });
    }
    const attendees = Array.isArray(body.attendees) ? body.attendees.map((email: unknown) => String(email).trim()).filter((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)).map((email: string) => ({ email })) : [];
    const created = await result.calendar.events.insert({ calendarId: 'primary', sendUpdates: attendees.length ? 'all' : 'none', requestBody: {
      summary, description: String(body.description || ''), location: String(body.location || ''),
      start: { dateTime: new Date(start).toISOString() }, end: { dateTime: new Date(end).toISOString() }, attendees,
    } });
    return NextResponse.json({ event: { id: created.data.id, htmlLink: created.data.htmlLink }, connected: true }, { status: 201 });
  } catch (error) {
    console.error('Google Calendar create failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create the Google Calendar meeting.' }, { status: 500 });
  }
}
