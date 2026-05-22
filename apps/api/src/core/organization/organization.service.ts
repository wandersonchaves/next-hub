import { Injectable, ForbiddenException, NotFoundException, Inject, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@enterprise/database';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private auditLogsService: AuditLogsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createOrganization(userId: string, name: string, slug: string) {
    const existingOrg = await this.prisma.client.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new ForbiddenException('Organization slug already exists');
    }

    const org = await this.prisma.client.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: true,
      },
    });

    // Async logging
    this.auditLogsService.log({
      action: 'ORGANIZATION_CREATE',
      entity: 'Organization',
      entityId: org.id,
      userId,
      organizationId: org.id,
      metadata: { name, slug },
    });

    return org;
  }

  async getOrganization(id: string) {
    try {
      const cachedOrg = await this.cacheManager.get(`org:${id}`);
      if (cachedOrg) return cachedOrg;
    } catch (err) {
      console.error('Cache get error:', err);
    }

    const org = await this.prisma.client.organization.findUnique({
      where: { id },
    });

    if (!org) throw new NotFoundException('Organization not found');

    try {
      await this.cacheManager.set(`org:${id}`, org);
    } catch (err) {
      console.error('Cache set error:', err);
    }
    return org;
  }

  async getMembers(organizationId: string) {
    return this.prisma.client.member.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async updateOrganization(id: string, data: { name?: string, avatarUrl?: string, brandColor?: string }) {
    const org = await this.prisma.client.organization.update({
      where: { id },
      data,
    });

    // Invalida o cache
    try {
      await this.cacheManager.del(`org:${id}`);
    } catch (err) {}

    return org;
  }

  async inviteMember(organizationId: string, email: string, role: Role, authorId: string) {
    // Check if author has permission to invite
    const authorMember = await this.prisma.client.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: authorId,
        },
      },
    });

    if (!authorMember || !['OWNER', 'ADMIN'].includes(authorMember.role)) {
      throw new ForbiddenException('Only owners and admins can invite members');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.client.member.findFirst({
      where: {
        organizationId,
        user: { email },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    // Check if there is already a pending invite
    const existingInvite = await this.prisma.client.invite.findFirst({
      where: {
        organizationId,
        email,
      },
    });

    if (existingInvite) {
      throw new ConflictException('An invite has already been sent to this email');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const invite = await this.prisma.client.invite.create({
      data: {
        email,
        role,
        token,
        expiresAt,
        organizationId,
        authorId,
      },
    });

    // Async logging
    this.auditLogsService.log({
      action: 'MEMBER_INVITE',
      entity: 'Invite',
      entityId: invite.id,
      userId: authorId,
      organizationId,
      metadata: { email, role },
    });

    // Send an email here with the invite link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const inviteLink = `${frontendUrl}/invite?token=${token}`;

    await this.notificationsService.sendOrgInvite(
      email,
      'You have been invited to join an organization',
      `<p>You have been invited to join. Click <a href="${inviteLink}">here</a> to accept.</p>`,
    );

    return invite;
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.client.invite.findUnique({
      where: { token },
    });

    if (!invite || invite.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired invite token');
    }

    // Add user to organization
    const member = await this.prisma.client.member.create({
      data: {
        organizationId: invite.organizationId,
        userId: userId,
        role: invite.role,
      },
    });

    // Delete invite after use
    await this.prisma.client.invite.delete({ where: { id: invite.id } });

    // Audit log
    this.auditLogsService.log({
      action: 'MEMBER_JOINED',
      entity: 'Member',
      entityId: member.id,
      userId: userId,
      organizationId: invite.organizationId,
      metadata: { method: 'INVITE_LINK' },
    });

    return member;
  }
}
