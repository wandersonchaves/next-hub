import { z } from 'zod';
export declare const RoleEnum: z.ZodEnum<["OWNER", "ADMIN", "MEMBER", "VIEWER"]>;
export declare const inviteMemberSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["OWNER", "ADMIN", "MEMBER", "VIEWER"]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
}, {
    email: string;
    role?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" | undefined;
}>;
export declare const createOrganizationSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
}, {
    name: string;
    slug: string;
}>;
export type InviteMemberRequest = z.infer<typeof inviteMemberSchema>;
export type CreateOrganizationRequest = z.infer<typeof createOrganizationSchema>;
export type Role = z.infer<typeof RoleEnum>;
