import { IsString, Length } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  @Length(1, 32)
  code: string;
}
