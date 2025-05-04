import { Controller, Post, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  async createUser(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Get()
  async getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Get(':id')
  async getUserById(@Param('id') id: number) {
    return this.userService.getUserById(Number(id));
  }

  @Put(':id')
  async updateUser(@Param('id') id: number, @Body() body: UpdateUserDto) {
    return this.userService.updateUser(Number(id), body);
  }

  @Delete(':id')
  async softDeleteUser(@Param('id') id: number) {
    return this.userService.softDeleteUser(Number(id));
  }
  @Post('login')
  async login(@Body('email') email: string, @Body('password') password: string) {
    return this.userService.login(email, password);
  }
}
