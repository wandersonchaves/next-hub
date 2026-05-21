import { z } from 'zod';

export const RoleEnum = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: RoleEnum.default('MEMBER'),
});

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
});

export type InviteMemberRequest = z.infer<typeof inviteMemberSchema>;
export type CreateOrganizationRequest = z.infer<typeof createOrganizationSchema>;
export type Role = z.infer<typeof RoleEnum>;
