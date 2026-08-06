import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDistributionDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(255)
  name?: string;

  /** Broker ids to include. Percentages are set afterwards. */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  brokerIds?: number[];
}
