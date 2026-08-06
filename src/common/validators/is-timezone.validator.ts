import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/** True when the runtime accepts the string as an IANA zone. */
export function isValidTimezone(value: unknown): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function IsTimezone(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isTimezone',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => isValidTimezone(value),
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be a valid IANA timezone, e.g. Asia/Manila`,
      },
    });
  };
}
