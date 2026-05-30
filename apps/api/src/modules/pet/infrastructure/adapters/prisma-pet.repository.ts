import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PetRepository } from '../../application/ports/pet.repository';
import { Pet } from '../../domain/entities/pet.entity';
import { PetService } from '../../domain/entities/service.entity';

@Injectable()
export class PrismaPetRepository implements PetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(pet: Pet): Promise<Pet> {
    const data = await this.prisma.client.pet.upsert({
      where: { id: pet.id || 'new' },
      update: {
        name: pet.name,
        breed: pet.breed,
        size: pet.size as any,
        weight: pet.weight,
        lastBathAt: pet.lastBathAt,
      },
      create: {
        name: pet.name,
        breed: pet.breed,
        size: pet.size as any,
        weight: pet.weight,
        lastBathAt: pet.lastBathAt,
        tutorId: pet.tutorId,
        organizationId: pet.organizationId,
        unitId: pet.unitId,
      }
    });

    return new Pet(
      data.id,
      data.name,
      data.breed,
      data.size,
      data.weight,
      data.lastBathAt,
      data.tutorId,
      data.organizationId,
      data.unitId,
    );
  }

  async findAllByUnit(unitId: string): Promise<Pet[]> {
    const pets = await this.prisma.client.pet.findMany({
      where: { unitId },
    });

    return pets.map(data => new Pet(
      data.id,
      data.name,
      data.breed,
      data.size,
      data.weight,
      data.lastBathAt,
      data.tutorId,
      data.organizationId,
      data.unitId,
    ));
  }

  async findById(id: string): Promise<Pet | null> {
    const pet = await this.prisma.client.pet.findUnique({
      where: { id }
    });

    if (!pet) return null;

    return new Pet(
      pet.id,
      pet.name,
      pet.breed,
      pet.size,
      pet.weight,
      pet.lastBathAt,
      pet.tutorId,
      pet.organizationId,
      pet.unitId,
    );
  }

  async saveService(service: PetService, organizationId: string, unitId: string): Promise<PetService> {
    const data = await this.prisma.client.petService.upsert({
      where: { id: service.id || 'new' },
      update: {
        name: service.name,
        price: service.price as any,
        durationInMinutes: service.durationInMinutes,
        type: service.type as any,
      },
      create: {
        name: service.name,
        price: service.price as any,
        durationInMinutes: service.durationInMinutes,
        type: service.type as any,
        organizationId,
        unitId,
      }
    });

    return new PetService(
      data.id,
      data.name,
      Number(data.price),
      data.durationInMinutes,
      data.type as any,
    );
  }

  async findServicesByUnit(unitId: string): Promise<PetService[]> {
    const services = await this.prisma.client.petService.findMany({
      where: { unitId },
    });

    return services.map(data => new PetService(
      data.id,
      data.name,
      Number(data.price),
      data.durationInMinutes,
      data.type as any,
    ));
  }
}
