import { apiRequest } from './api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export const organizationService = {
  async create(name: string, slug: string) {
    return apiRequest<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
  },

  async getById(id: string) {
    return apiRequest<Organization>(`/organizations/${id}`);
  },

  async inviteMember(organizationId: string, email: string, role: string) {
    return apiRequest(`/organizations/${organizationId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }
};
