import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers() {
    return this.prisma.user.findMany({
      where: { deleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        birthDate: true,
        phone: true,
        about: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        password: false,
      }
    });
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        birthDate: true,
        phone: true,
        about: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        password: false,
      }
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async getUserProfile(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted: false },
      include: {
        medicalHistory: true,
        preferences: true,
        diagnoses: {
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Remover a senha do objeto de retorno
    const { password, ...result } = user;
    return result;
  }

  async markFirstLoginComplete(id: number) {
    await this.getUserById(id);
    return this.prisma.user.update({
      where: { id },
      data: { isFirstLogin: false },
    });
  }

  async updateUser(id: number, data: UpdateUserDto) {
    await this.getUserById(id);

    // Extrair campos aninhados para atualização separada
    const { medicalHistory, preferences, birthDate, ...userData } = data;

    // Preparar dados do usuário com conversão de data se necessário
    const updateData = {
      ...userData,
      ...(birthDate && { birthDate: new Date(birthDate) }),
    };

    // Atualizar o usuário
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        medicalHistory: true,
        preferences: true,
      },
    });

    // Atualizar histórico médico se fornecido
    if (medicalHistory && updatedUser.medicalHistory) {
      await this.prisma.medicalHistory.update({
        where: { userId: id },
        data: medicalHistory,
      });
    }

    // Atualizar preferências se fornecidas
    if (preferences && updatedUser.preferences) {
      await this.prisma.userPreferences.update({
        where: { userId: id },
        data: preferences,
      });
    }

    // Buscar usuário atualizado
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        medicalHistory: true,
        preferences: true,
      },
    });

    // Remover a senha do objeto de retorno
    const { password, ...result } = user;
    return result;
  }

  async softDeleteUser(id: number) {
    await this.getUserById(id);
    return this.prisma.user.update({
      where: { id },
      data: { deleted: true },
    });
  }

  async selectClinic(userId: number, clinicId: number) {
    // Verificar se o usuário existe
    await this.getUserById(userId);

    // Verificar se a clínica existe e está aprovada
    const clinic = await this.prisma.clinic.findFirst({
      where: {
        id: clinicId,
        status: 'APPROVED'
      }
    });

    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada ou não aprovada');
    }

    // Atualizar o usuário com a clínica selecionada
    return this.prisma.user.update({
      where: { id: userId },
      data: { selectedClinicId: clinicId },
    });
  }
}
