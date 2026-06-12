import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingCenter } from './entities/training-center.entity';
import { TrainingCenterEmployee } from './entities/training-center-employee.entity';
import { TrainingCentersService } from './training-centers.service';
import { EmployeesService } from './employees.service';
import { TrainingCentersController } from './training-centers.controller';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingCenter, TrainingCenterEmployee])],
  controllers: [TrainingCentersController, EmployeesController],
  providers: [TrainingCentersService, EmployeesService],
})
export class TrainingCentersModule {}
