import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsIn, IsString } from 'class-validator';

export class PaginationDto {
  @ApiProperty({
    description: 'Número da página',
    example: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Número de itens por página',
    example: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    description: 'Campo para ordenação',
    example: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Direção da ordenação',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Lista de itens',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Informações de paginação',
    example: {
      total: 45,
      page: 1,
      limit: 10,
      pages: 5,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
