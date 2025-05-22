import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock do bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      birthDate: new Date().toISOString(),
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 1,
        name: registerDto.name,
        email: registerDto.email,
        password: 'hashedPassword',
        birthDate: new Date(registerDto.birthDate),
        profileImage: 'Default_pfp.jpg',
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        medicalHistory: {
          id: 1,
          existingConditions: [],
          familyHistory: [],
          medications: [],
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        preferences: {
          id: 1,
          notificationsEnabled: true,
          reminderFrequency: 'daily',
          language: 'pt',
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('token', 'mock-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1, email: registerDto.email });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: loginDto.email,
        password: 'hashedPassword',
        name: 'Test User',
        birthDate: new Date(),
        profileImage: 'Default_pfp.jpg',
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        medicalHistory: null,
        preferences: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email, deleted: false },
        include: {
          medicalHistory: true,
          preferences: true,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toHaveProperty('token', 'mock-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email, deleted: false },
        include: {
          medicalHistory: true,
          preferences: true,
        },
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        id: 1,
        email: loginDto.email,
        password: 'hashedPassword',
        name: 'Test User',
        birthDate: new Date(),
        profileImage: 'Default_pfp.jpg',
        deleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        medicalHistory: null,
        preferences: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: loginDto.email, deleted: false },
        include: {
          medicalHistory: true,
          preferences: true,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
    });
  });
});
