import { NextResponse } from 'next/server';
import { callOpenAiChat } from '@/src/crm/core/openai';

type Body = {
  sectionType?: string;
  title?: string;
  currentContent?: string;
  businessName?: string;
  services?: string[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;

    const sectionType = (body.sectionType || 'custom').trim();
    const title = (body.title || 'Section').trim();
    const currentContent = (body.currentContent || '').trim();
    const businessName = (body.businessName || 'Contractor Business').trim();
    const services = Array.isArray(body.services) ? body.services.slice(0, 8) : [];

    const regenerated = await callOpenAiChat(
      [
        {
          role: 'user',
          content: [
            `Regenerate website section copy for a contractor platform.`,
            `Section type: ${sectionType}`,
            `Title: ${title}`,
            `Business: ${businessName}`,
            `Services: ${services.join(', ') || 'General contracting'}`,
            `Current content: ${currentContent || 'none'}`,
            'Return concise high-converting copy only. No markdown bullets. No intro text.',
          ].join('\n'),
        },
      ],
      'sales'
    );

    return NextResponse.json({ content: regenerated });
  } catch {
    return NextResponse.json({ error: 'Unable to regenerate section content.' }, { status: 500 });
  }
}
