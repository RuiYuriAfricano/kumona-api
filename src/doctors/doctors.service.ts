import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface GetDoctorsParams {
  specialty?: string;
  city?: string;
  page: number;
  limit: number;
}

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async getDoctors(params: GetDoctorsParams) {
    const { specialty, city, page, limit } = params;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      role: 'CLINIC',
      clinic: {
        status: 'APPROVED' // Only show approved clinics
      }
    };

    // Add specialty filter if provided
    if (specialty) {
      where.clinic.specialties = {
        has: specialty
      };
    }

    // Add city filter if provided
    if (city) {
      where.clinic.city = {
        contains: city,
        mode: 'insensitive'
      };
    }

    const [doctors, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              phone: true,
              specialties: true,
              responsibleCrm: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: {
          clinic: {
            name: 'asc'
          }
        }
      }),
      this.prisma.user.count({ where })
    ]);

    // Transform the data to match the expected format
    const transformedDoctors = doctors.map(doctor => ({
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      specialties: doctor.clinic?.specialties || [],
      clinic: doctor.clinic ? {
        id: doctor.clinic.id,
        name: doctor.clinic.name,
        address: doctor.clinic.address,
        city: doctor.clinic.city,
        phone: doctor.clinic.phone
      } : null,
      responsibleCrm: doctor.clinic?.responsibleCrm,
      createdAt: doctor.createdAt.toISOString()
    }));

    return {
      doctors: transformedDoctors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getDoctorById(id: number) {
    const doctor = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'CLINIC',
        clinic: {
          status: 'APPROVED'
        }
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phone: true,
            specialties: true,
            responsibleCrm: true,
            description: true
          }
        }
      }
    });

    if (!doctor) {
      throw new NotFoundException('Médico não encontrado');
    }

    return {
      id: doctor.id,
      name: doctor.name,
      email: doctor.email,
      specialties: doctor.clinic?.specialties || [],
      clinic: doctor.clinic ? {
        id: doctor.clinic.id,
        name: doctor.clinic.name,
        address: doctor.clinic.address,
        city: doctor.clinic.city,
        phone: doctor.clinic.phone,
        description: doctor.clinic.description
      } : null,
      responsibleCrm: doctor.clinic?.responsibleCrm,
      createdAt: doctor.createdAt.toISOString()
    };
  }

  async getSpecialties() {
    // Get all unique specialties from approved clinics
    const clinics = await this.prisma.clinic.findMany({
      where: {
        status: 'APPROVED'
      },
      select: {
        specialties: true
      }
    });

    // Flatten and get unique specialties
    const allSpecialties = clinics.flatMap(clinic => clinic.specialties);
    const uniqueSpecialties = [...new Set(allSpecialties)].sort();

    return {
      specialties: uniqueSpecialties
    };
  }
}
