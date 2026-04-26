import { NextResponse } from 'next/server';
import { scrapeMockBids } from '@/lib/bidboard/scraper';

export async function GET() {
  try {
    const projects = await scrapeMockBids(20); // MVP: Mock → real scrapers next
    return NextResponse.json(
      { projects },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bid fetch failed';
    return NextResponse.json({ error: message, projects: [] }, { status: 500 });
  }
}


