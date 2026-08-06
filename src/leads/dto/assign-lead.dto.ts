import { IsInt, Min } from 'class-validator';

export class AssignLeadDto {
  @IsInt()
  @Min(1)
  brokerId!: number;
}
