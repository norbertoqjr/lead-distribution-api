import { IsEnum, IsOptional } from 'class-validator';
import { LeadStatus } from '../../entities';

export class QueryLeadsDto {
  @IsOptional()
  @IsEnum(LeadStatus, {
    message: 'Status must be sent, unsent, duplicate or failed',
  })
  status?: LeadStatus;
}
