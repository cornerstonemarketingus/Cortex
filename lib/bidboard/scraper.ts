// Bid scraper MVP - Mock data first, then real sources
// Real: sam.gov RSS, bidnet direct scrape w/ Puppeteer
import { BidProject } from '@/lib/bidboard/types';

export interface RawBid {
  title: string;
  location: string;
  dueDate: string;
  value?: string;
  company?: string;
  description?: string;
}

const COMPANY_LOGO_DOMAINS: Record<string, string> = {
  'Turner Construction': 'turnerconstruction.com',
  'Skanska USA': 'skanska.com',
  'Balfour Beatty': 'balfourbeattyus.com',
  'Clark Construction': 'clarkconstruction.com',
};

function toStableId(seed: string): string {
  const normalized = seed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `bid-${normalized}`;
}

export async function scrapeMockBids(count: number): Promise<BidProject[]> {
  // Mock commercial bids (replace with real scrapers)
  const mockBids: RawBid[] = Array.from({ length: count }, (_, i) => ({
    title: `Commercial Office Renovation #${i + 1}`,
    location: ['Miami, FL', 'Austin, TX', 'Denver, CO', 'Phoenix, AZ', 'Seattle, WA'][i % 5],
    dueDate: new Date(Date.now() + Math.random() * 30 * 86400000).toISOString().split('T')[0],
    value: ['$500K-$1.2M', '$2.5M-$4M', '$800K-$1.5M', '$1M-$2M'][Math.floor(Math.random() * 4)],
    company: ['Turner Construction', 'Skanska USA', 'Balfour Beatty', 'Clark Construction'][i % 4],
    description: 'Tenant improvement package including demo, framing, MEP coordination, and finish work.',
  }));

  // Simulate async scraping
  await new Promise(r => setTimeout(r, 1000));

  return mockBids.map((bid, index) => ({
    id: toStableId(`${bid.title}-${bid.location}-${bid.dueDate}-${index}`),
    title: bid.title,
    description: bid.description || 'Commercial renovation scope with phased execution and closeout requirements.',
    location: {
      city: bid.location.split(', ')[0],
      state: bid.location.split(', ')[1],
    },
    postedDate: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    dueDate: bid.dueDate,
    valueRange: bid.value,
    company: {
      name: bid.company || 'General Contractor',
      logoUrl: bid.company && COMPANY_LOGO_DOMAINS[bid.company]
        ? `https://logo.clearbit.com/${COMPANY_LOGO_DOMAINS[bid.company]}`
        : undefined,
    },
    contacts: [ // Mock gated data
      { name: 'John Smith', phone: '(555) 123-4567', email: 'john@company.com' },
      { name: 'Sarah Johnson', phone: '(555) 987-6543', email: 'sarah@company.com' },
    ],
    documents: [`/api/bidboard/docs/${bid.title.replace(/\s+/g, '-')}`],
    scrapedUrl: 'https://mock.bidnet.com/project/123',
  }));
}

// TODO: Real scrapers
// export async function scrapeSamGov() { }
// export async function scrapeBidNet() { }

