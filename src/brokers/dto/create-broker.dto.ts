import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsTimezone } from '../../common/validators/is-timezone.validator';

/**
 * Mirrors the Zod schema on the web side. Any change here must be made there
 * in the same commit — see the implementation-rules skill.
 */
export class CreateBrokerDto {
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsInt({ message: 'Daily cap must be a whole number' })
  @Min(0)
  @Max(100000)
  dailyCap!: number;

  @IsTimezone()
  timezone!: string;

  /** Minutes from midnight, 0-1440, in the broker's own timezone. */
  @IsInt()
  @Min(0)
  @Max(1440)
  openMinute!: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  closeMinute!: number;

  /** ISO weekdays: 1 = Monday .. 7 = Sunday. */
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one working day' })
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  workingDays!: number[];
}
