export interface SourcedLead {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  placeId: string;
}

export interface ILeadSourceProvider {
  searchCompanies(sector: string, region: string): Promise<SourcedLead[]>;
}

export interface IContactFinder {
  findMissingPhone(companyName: string, website?: string): Promise<string | null>;
}
