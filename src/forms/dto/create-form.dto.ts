import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateFormDto {
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Form name is required' })
  @MaxLength(255)
  name!: string;

  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Slug is required' })
  @MaxLength(255)
  @Matches(SLUG_PATTERN, {
    message: 'Slug may contain lowercase letters, numbers and hyphens only',
  })
  slug!: string;
}
