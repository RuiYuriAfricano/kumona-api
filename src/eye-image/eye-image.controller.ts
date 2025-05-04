import { Controller, Post, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { EyeImageService } from './eye-image.service';
import { CreateEyeImageDto } from './dtos/create-eye-image.dto';
import { UpdateEyeImageDto } from './dtos/update-eye-image.dto';

@Controller('eye-images')
export class EyeImageController {
  constructor(private eyeImageService: EyeImageService) {}

  @Post()
  create(@Body() body: CreateEyeImageDto) {
    return this.eyeImageService.create(body);
  }

  @Get()
  findAll() {
    return this.eyeImageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.eyeImageService.findOne(Number(id));
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body: UpdateEyeImageDto) {
    return this.eyeImageService.update(Number(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.eyeImageService.remove(Number(id));
  }
}
