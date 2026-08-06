import { IsEnum, IsOptional } from 'class-validator';
import { LeadStatus } from '../../entities';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryLeadsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LeadStatus, {
    message: 'Status must be sent, unsent, duplicate or failed',
  })
  status?: LeadStatus;
}
