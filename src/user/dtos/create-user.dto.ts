import { IsString, IsEmail, IsNotEmpty, IsPhoneNumber, isString, isNotIn, isNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsPhoneNumber('AO')
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  role: string; // "consumer" or "producer"
}
