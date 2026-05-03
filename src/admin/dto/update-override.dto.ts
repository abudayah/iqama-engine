import { PartialType } from '@nestjs/mapped-types';
import { CreateOverrideDto } from './create-override.dto';

export class UpdateOverrideDto extends PartialType(CreateOverrideDto) {}
