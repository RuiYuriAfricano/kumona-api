import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEyeImageDto } from './dtos/create-eye-image.dto';
import { UpdateEyeImageDto } from './dtos/update-eye-image.dto';

@Injectable()
export class EyeImageService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateEyeImageDto) {
    return this.prisma.eyeImage.create({ data });
  }

  async findAll() {
    return this.prisma.eyeImage.findMany({ include: { user: true } });
  }

  async findOne(id: number) {
    const image = await this.prisma.eyeImage.findUnique({ where: { id }, include: { user: true } });
    if (!image) throw new NotFoundException('Eye image not found');
    return image;
  }

  async update(id: number, data: UpdateEyeImageDto) {
    await this.findOne(id);
    return this.prisma.eyeImage.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.eyeImage.delete({ where: { id } });
  }
}
