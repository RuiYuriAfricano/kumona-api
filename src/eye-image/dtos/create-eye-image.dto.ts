// create-eye-image.dto.ts
import { IsString, IsNotEmpty, IsInt } from 'class-validator';

export class CreateEyeImageDto {
  @IsString()
  @IsNotEmpty()
  image: string; // base64

  @IsString()
  @IsNotEmpty()
  target: string; // nome da doença (ex: Catarata)

  @IsInt()
  @IsNotEmpty()
  userId: number;
}
