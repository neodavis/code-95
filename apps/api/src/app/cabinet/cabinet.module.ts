import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CabinetController } from './cabinet.controller';
import { RegistryController } from './registry.controller';
import { CabinetService } from './cabinet.service';
import { StorageService } from '../storage/storage.service';
import { TrainingCenter } from '../training-centers/entities/training-center.entity';
import { TrainingCenterEmployee } from '../training-centers/entities/training-center-employee.entity';
import { StudyGroupType } from '../study-group-types/entities/study-group-type.entity';
import { StudyGroup } from './entities/study-group.entity';
import { StudyGroupStudent } from './entities/study-group-student.entity';
import { StudyGroupLog } from './entities/study-group-log.entity';
import { EDriver } from './entities/edriver.entity';
import { ESPK } from './entities/espk.entity';
import { ECard } from './entities/ecard.entity';
import { EDriverRegistry } from './entities/edriver-registry.entity';
import { ECarryType } from './entities/ecarry-type.entity';
import { EConstant } from './entities/econstant.entity';
import { ECountry } from './entities/ecountry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrainingCenter,
      TrainingCenterEmployee,
      StudyGroupType,
      StudyGroup,
      StudyGroupStudent,
      StudyGroupLog,
      EDriver,
      ESPK,
      ECard,
      EDriverRegistry,
      ECarryType,
      EConstant,
      ECountry,
    ]),
  ],
  controllers: [CabinetController, RegistryController],
  providers: [CabinetService, StorageService],
})
export class CabinetModule {}
