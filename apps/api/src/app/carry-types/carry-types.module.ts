import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ECarryType } from '../cabinet/entities/ecarry-type.entity';
import { CarryTypesService } from './carry-types.service';
import { CarryTypesController } from './carry-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ECarryType])],
  controllers: [CarryTypesController],
  providers: [CarryTypesService],
})
export class CarryTypesModule {}
