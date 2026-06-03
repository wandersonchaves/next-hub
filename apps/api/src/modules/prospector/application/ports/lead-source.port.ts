export interface ScrapedLead {
  name: string;
  phone: string;
  address?: string;
  rating?: number;
  website?: string;
}

export interface ILeadSourceProvider {
  findLeads(sector: string, region: string): Promise<ScrapedLead[]>;
}

export interface IContactFinder {
  findMissingPhone(companyName: string, website?: string): Promise<string | null>;
}
