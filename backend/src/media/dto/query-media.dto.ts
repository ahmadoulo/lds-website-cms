import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QueryMediaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Restrict to one logical folder' })
  @IsString()
  @MaxLength(40)
  @IsOptional()
  folder?: string;
}
