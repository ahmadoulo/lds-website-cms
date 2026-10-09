import { IsDateString, IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QueryNewsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['draft', 'scheduled', 'published', 'archived'] })
  @IsIn(['draft', 'scheduled', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'scheduled' | 'published' | 'archived';

  /** Created within this period. */
  @ApiPropertyOptional() @IsDateString() @IsOptional() from?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() to?: string;
}
