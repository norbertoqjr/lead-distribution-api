import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DistributionBrokerDto {
  @IsInt()
  brokerId!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Percentage cannot be negative' })
  @Max(100, { message: 'Percentage cannot exceed 100' })
  percentage!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetBrokersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DistributionBrokerDto)
  brokers!: DistributionBrokerDto[];
}
