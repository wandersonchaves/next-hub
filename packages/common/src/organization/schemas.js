"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrganizationSchema = exports.inviteMemberSchema = exports.RoleEnum = void 0;
const zod_1 = require("zod");
exports.RoleEnum = zod_1.z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
exports.inviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    role: exports.RoleEnum.default('MEMBER'),
});
exports.createOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    slug: zod_1.z.string().min(2, 'Slug must be at least 2 characters'),
});
//# sourceMappingURL=schemas.js.map