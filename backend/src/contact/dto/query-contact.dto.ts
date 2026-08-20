import { IsBooleanString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class QueryContactDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter on read/unread state' })
  @IsBooleanString()
  @IsOptional()
  isRead?: string;
}
