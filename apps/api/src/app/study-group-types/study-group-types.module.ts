import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyGroupType } from './entities/study-group-type.entity';
import { StudyGroupTypesService } from './study-group-types.service';
import { StudyGroupTypesController } from './study-group-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StudyGroupType])],
  controllers: [StudyGroupTypesController],
  providers: [StudyGroupTypesService],
})
export class StudyGroupTypesModule {}
