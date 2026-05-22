import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IPetRepository } from '../../application/ports/pet.repository';
import { Pet, PetSize } from '../../domain/entities/pet.entity';
import { PetService, PetServiceType } from '../../domain/entities/service.entity';
import { PetSize as PrismaPetSize, PetServiceType as PrismaPetServiceType } from '@enterprise/database';

@Injectable()
export class PrismaPetRepository implements IPetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Pet | null> {
    const data = await this.prisma.client.pet.findUnique({
      where: { id },
    });

    if (!data) return null;

    return new Pet(
      data.id,
      data.name,
      data.breed,
      data.size as unknown as PetSize,
      data.weight,
      data.lastBathAt,
      data.tutorId,
      data.organizationId,
      data.branchId,
    );
  }

  async findAllByBranch(branchId: string): Promise<Pet[]> {
    const items = await this.prisma.client.pet.findMany({
      where: { branchId },
    });

    return items.map(
      (data) =>
        new Pet(
          data.id,
          data.name,
          data.breed,
          data.size as unknown as PetSize,
          data.weight,
          data.lastBathAt,
          data.tutorId,
          data.organizationId,
          data.branchId,
        ),
    );
  }

  async save(pet: Pet): Promise<Pet> {
    const data = await this.prisma.client.pet.upsert({
      where: { id: pet.id || 'new' },
      update: {
        name: pet.name,
        breed: pet.breed,
        size: pet.size as unknown as PrismaPetSize,
        weight: pet.weight,
        lastBathAt: pet.lastBathAt,
        tutorId: pet.tutorId,
      },
      create: {
        name: pet.name,
        breed: pet.breed,
        size: pet.size as unknown as PrismaPetSize,
        weight: pet.weight,
        lastBathAt: pet.lastBathAt,
        tutorId: pet.tutorId,
        organizationId: pet.organizationId,
        branchId: pet.branchId,
      },
    });

    return new Pet(
      data.id,
      data.name,
      data.breed,
      data.size as unknown as PetSize,
      data.weight,
      data.lastBathAt,
      data.tutorId,
      data.organizationId,
      data.branchId,
    );
  }

  async saveService(service: PetService, organizationId: string, branchId: string): Promise<PetService> {
    const data = await this.prisma.client.petService.upsert({
      where: { id: service.id || 'new' },
      update: {
        name: service.name,
        price: service.price,
        durationInMinutes: service.durationInMinutes,
        type: service.type as unknown as PrismaPetServiceType,
      },
      create: {
        name: service.name,
        price: service.price,
        durationInMinutes: service.durationInMinutes,
        type: service.type as unknown as PrismaPetServiceType,
        organizationId,
        branchId,
      },
    });

    return new PetService(
      data.id,
      data.name,
      data.price.toNumber(),
      data.durationInMinutes,
      data.type as unknown as PetServiceType,
    );
  }

  async findServicesByBranch(branchId: string): Promise<PetService[]> {
    const items = await this.prisma.client.petService.findMany({
      where: { branchId },
    });

    return items.map(
      (data) =>
        new PetService(
          data.id,
          data.name,
          data.price.toNumber(),
          data.durationInMinutes,
          data.type as unknown as PetServiceType,
        ),
    );
  }
}
