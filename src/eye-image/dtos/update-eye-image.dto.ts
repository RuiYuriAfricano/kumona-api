// update-eye-image.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateEyeImageDto } from './create-eye-image.dto';

export class UpdateEyeImageDto extends PartialType(CreateEyeImageDto) {}
