import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService
  ) {}

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
        selectedClinic: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            specialties: true,
            description: true,
            logo: true,
            status: true
          }
        },
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
    const { medicalHistory, preferences, birthDate, currentPassword, newPassword, ...userData } = data as any;

    // Preparar dados do usuário com conversão de data se necessário
    const updateData = {
      ...userData,
      ...(birthDate && { birthDate: new Date(birthDate) }),
    };

    // Se uma nova senha foi fornecida, validar e fazer hash
    if (newPassword) {
      if (!currentPassword) {
        throw new BadRequestException('Senha atual é obrigatória para alterar a senha');
      }

      // Buscar o usuário com a senha atual para validação
      const userWithPassword = await this.prisma.user.findUnique({
        where: { id, deleted: false },
        select: { password: true }
      });

      if (!userWithPassword) {
        throw new NotFoundException('Usuário não encontrado');
      }

      // Verificar se a senha atual está correta
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Senha atual incorreta');
      }

      // Verificar se a nova senha é diferente da atual
      const isSamePassword = await bcrypt.compare(newPassword, userWithPassword.password);
      if (isSamePassword) {
        throw new BadRequestException('A nova senha deve ser diferente da senha atual');
      }

      // Hash da nova senha
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedNewPassword;
    }

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

    // Criar notificação de perfil atualizado
    try {
      await this.notificationsService.createNotification(
        id,
        '✅ Perfil Atualizado',
        'Suas informações de perfil foram atualizadas com sucesso. Mantenha seus dados sempre atualizados para uma melhor experiência.',
        'success'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de perfil atualizado:', error);
    }

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
    const user = await this.getUserById(userId);

    // Verificar se a clínica existe e está aprovada
    const clinic = await this.prisma.clinic.findFirst({
      where: {
        id: clinicId,
        status: 'APPROVED'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!clinic) {
      throw new NotFoundException('Clínica não encontrada ou não aprovada');
    }

    // Atualizar o usuário com a clínica selecionada
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { selectedClinicId: clinicId },
    });

    // Criar notificação de clínica selecionada
    try {
      await this.notificationsService.createNotification(
        userId,
        '🏥 Clínica Selecionada',
        `Você selecionou a clínica "${clinic.name}" com sucesso. Agora você pode agendar consultas e receber acompanhamento especializado.`,
        'success'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de clínica selecionada:', error);
    }

    // Notificar o médico/clínica sobre o novo paciente interessado
    try {
      await this.notificationsService.createNotification(
        clinic.user.id,
        '👤 Novo Paciente Interessado',
        `${user.name} selecionou sua clínica para acompanhamento. Entre em contato para agendar uma consulta.`,
        'info'
      );
    } catch (error) {
      console.error('Erro ao notificar clínica sobre novo paciente:', error);
    }

    return updatedUser;
  }

  /**
   * Alterar senha do usuário
   */
  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Buscar o usuário com a senha atual
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deleted: false },
      select: {
        id: true,
        email: true,
        name: true,
        password: true
      }
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verificar se a senha atual está correta
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    // Verificar se a nova senha é diferente da atual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('A nova senha deve ser diferente da senha atual');
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar a senha no banco de dados
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    // Criar notificação sobre a mudança de senha
    try {
      await this.notificationsService.createNotification(
        userId,
        '🔒 Senha Alterada',
        'Sua senha foi alterada com sucesso. Se você não fez esta alteração, entre em contato conosco imediatamente.',
        'info'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de mudança de senha:', error);
    }

    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Atualizar histórico médico do usuário
   */
  async updateMedicalHistory(userId: number, medicalHistoryData: {
    existingConditions: string[];
    familyHistory: string[];
    medications: string[];
  }) {
    // Verificar se o usuário existe
    await this.getUserById(userId);

    // Verificar se já existe um histórico médico para o usuário
    const existingHistory = await this.prisma.medicalHistory.findUnique({
      where: { userId }
    });

    let medicalHistory;

    if (existingHistory) {
      // Atualizar histórico existente
      medicalHistory = await this.prisma.medicalHistory.update({
        where: { userId },
        data: {
          existingConditions: medicalHistoryData.existingConditions,
          familyHistory: medicalHistoryData.familyHistory,
          medications: medicalHistoryData.medications,
          updatedAt: new Date()
        }
      });
    } else {
      // Criar novo histórico médico
      medicalHistory = await this.prisma.medicalHistory.create({
        data: {
          userId,
          existingConditions: medicalHistoryData.existingConditions,
          familyHistory: medicalHistoryData.familyHistory,
          medications: medicalHistoryData.medications
        }
      });
    }

    // Criar notificação sobre a atualização do histórico médico
    try {
      await this.notificationsService.createNotification(
        userId,
        '📋 Histórico Médico Atualizado',
        'Seu histórico médico foi atualizado com sucesso. Essas informações ajudarão a fornecer um melhor acompanhamento.',
        'info'
      );
    } catch (error) {
      console.error('Erro ao criar notificação de histórico médico atualizado:', error);
    }

    return medicalHistory;
  }
}
