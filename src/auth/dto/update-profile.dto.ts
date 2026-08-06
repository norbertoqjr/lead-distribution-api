import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Email is deliberately absent. It is the login identifier and the key the
 * seed upserts on, so changing it here would let an admin lock themselves out
 * or collide with another account. Accepting the field and ignoring it would
 * be worse: the form would appear to save and silently not.
 */
export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(255)
  name?: string;

  /** Required only when setting a new password. */
  @ValidateIf((dto: UpdateProfileDto) => Boolean(dto.newPassword))
  @IsString()
  @MinLength(8, { message: 'Enter your current password' })
  @MaxLength(128)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128)
  newPassword?: string;
}
