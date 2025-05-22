import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();

    // Limpar dados de teste anteriores
    await prismaService.user.deleteMany({
      where: {
        email: 'test-e2e@example.com',
      },
    });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await prismaService.user.deleteMany({
      where: {
        email: 'test-e2e@example.com',
      },
    });
    
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test-e2e@example.com',
          password: 'password123',
          birthDate: new Date().toISOString(),
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('email', 'test-e2e@example.com');
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should return 400 if required fields are missing', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          // email is missing
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 409 if email already exists', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test User',
          email: 'test-e2e@example.com',
          password: 'password123',
          birthDate: new Date().toISOString(),
        })
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test-e2e@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('email', 'test-e2e@example.com');
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should return 401 with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test-e2e@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should return 401 if user does not exist', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });
});
