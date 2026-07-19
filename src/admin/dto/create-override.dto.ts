import {
  IsString,
  IsIn,
  IsDateString,
  Matches,
  ValidateIf,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Custom decorator: the decorated property (endDate) must be >= the sibling
 * property named by `property` (startDate).
 */
function IsDateAfterOrEqual(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateAfterOrEqual',
      target: (object as { constructor: new (...args: unknown[]) => unknown })
        .constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];
          if (typeof value !== 'string' || typeof relatedValue !== 'string') {
            return true; // let @IsDateString handle format errors
          }
          return value >= relatedValue;
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as [string];
          return `${args.property} must be on or after ${relatedPropertyName}`;
        },
      },
    });
  };
}

export class CreateOverrideDto {
  @IsString()
  @IsIn(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

  @IsString()
  @IsIn(['FIXED', 'OFFSET'])
  overrideType: 'FIXED' | 'OFFSET';

  @IsString()
  @ValidateIf((o: CreateOverrideDto) => o.overrideType === 'FIXED')
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'FIXED value must be in HH:mm format (e.g., 04:30)',
  })
  @ValidateIf((o: CreateOverrideDto) => o.overrideType === 'OFFSET')
  @Matches(/^[+-]?\d+$/, {
    message: 'OFFSET value must be a number (e.g., +15 or -10)',
  })
  value: string; // HH:mm for FIXED, numeric string (minutes) for OFFSET

  @IsDateString()
  startDate: string; // YYYY-MM-DD

  @IsDateString()
  @IsDateAfterOrEqual('startDate', {
    message: 'endDate must be on or after startDate',
  })
  endDate: string; // YYYY-MM-DD
}
