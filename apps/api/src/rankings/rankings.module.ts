import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rating } from '../ratings/entities/rating.entity';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rating])],
  controllers: [RankingsController],
  providers: [RankingsService],
})
export class RankingsModule {}
