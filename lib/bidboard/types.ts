export interface Location {
  city: string;
  state: string;
}

export interface Company {
  name: string;
  logoUrl?: string;
}

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface BidProject {
  id: string;
  title: string;
  description: string;
  location: Location;
  postedDate: string;
  dueDate: string;
  valueRange?: string;
  company: Company;
  contacts: Contact[]; // Gated behind subscription
  documents: string[]; // URLs
  scrapedUrl?: string;
}

