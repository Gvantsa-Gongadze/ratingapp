import { IsBoolean } from 'class-validator';

export class SetUserBannedDto {
  @IsBoolean()
  banned: boolean;
}
