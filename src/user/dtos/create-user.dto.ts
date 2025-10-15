import { IsString, IsEmail, IsNotEmpty, IsPhoneNumber, isString, isNotIn, isNotEmpty, IsEmpty, Matches } from 'class-validator';

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

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+244\s9\d{2}\s\d{3}\s\d{3}$/, {
    message: 'Telefone deve estar no formato +244 9XX XXX XXX e começar com 9'
  })
  phone: string;
}
