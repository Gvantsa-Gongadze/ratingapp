import type { GroupMode } from '@ratingapp/shared-types';
import { IsIn, IsString, Length } from 'class-validator';

const MODES: GroupMode[] = ['sync', 'individual'];

export class CreateGroupDto {
  @IsString()
  @Length(2, 60)
  name: string;

  @IsIn(MODES)
  mode: GroupMode;
}
