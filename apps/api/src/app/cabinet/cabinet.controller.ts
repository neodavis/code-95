import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { STORAGE_MAX_FILE_SIZE } from '../storage/storage.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { type JwtPayload } from '../auth/strategies/jwt.strategy';
import {
  parsePage,
  parsePageSize,
  parseSearch,
  parseSort,
} from '../common/paginate';
import { CabinetService } from './cabinet.service';
import { CreateStudyGroupDto } from './dto/create-study-group.dto';
import { UpdateStudyGroupDto } from './dto/update-study-group.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { CheckEligibilityDto } from './dto/check-eligibility.dto';
import { CreateSpkBulkDto } from './dto/create-spk-bulk.dto';
import { CreateECardDto } from './dto/create-ecard.dto';
import { UpdateSpkDto } from './dto/update-spk.dto';
import { UpdateECardDto } from './dto/update-ecard.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { UpdateDriverLicenseDto } from './dto/update-driver-license.dto';
import { SplitGroupDto } from './dto/split-group.dto';
import { SetCourseTypeDto } from './dto/set-course-type.dto';

@ApiTags('cabinet')
@ApiBearerAuth()
@Controller('cabinet')
@UseGuards(JwtAuthGuard)
export class CabinetController {
  constructor(private readonly cabinetService: CabinetService) {}

  // ── Dashboard ────────────────────────────────────────────────────────────
  @ApiOperation({
    summary: 'Get dashboard data for the current training center',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard data for the authenticated user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('me')
  getMe(@Request() req: { user: JwtPayload }): Promise<unknown> {
    return this.cabinetService.getDashboard(req.user.sub);
  }

  // ── Reference data ────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'Get list of carry types' })
  @ApiResponse({ status: 200, description: 'List of carry types' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('carry-types')
  getCarryTypes(): Promise<unknown> {
    return this.cabinetService.getCarryTypes();
  }

  @ApiOperation({ summary: 'Get list of study group types' })
  @ApiResponse({ status: 200, description: 'List of group types' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('group-types')
  getGroupTypes(): Promise<unknown> {
    return this.cabinetService.getGroupTypes();
  }

  @ApiOperation({ summary: 'Get cabinet constants (e.g. SPK counter)' })
  @ApiResponse({
    status: 200,
    description: 'Cabinet constants for the authenticated training center',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('constants')
  getConstants(): Promise<unknown> {
    return this.cabinetService.getConstants();
  }

  @ApiOperation({
    summary: 'Get list of countries for country-of-birth picker',
  })
  @ApiResponse({ status: 200, description: 'List of countries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('countries')
  getCountries(): Promise<unknown> {
    return this.cabinetService.getCountries();
  }

  // ── Drivers list ─────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'List drivers for the current training center' })
  @ApiResponse({ status: 200, description: 'Paginated list of drivers' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('drivers')
  getDrivers(
    @Request() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = CabinetService.DRIVERS_ALLOWED;
    return this.cabinetService.getDrivers(
      req.user.sub,
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({
    summary: 'Create a new driver for the current training center',
  })
  @ApiResponse({ status: 201, description: 'Driver created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('drivers')
  createDriver(
    @Request() req: { user: JwtPayload },
    @Body() body: CreateDriverDto,
  ): Promise<unknown> {
    return this.cabinetService.createDriver(req.user.sub, body);
  }

  @ApiOperation({ summary: 'Check course eligibility for driver snapshot' })
  @ApiResponse({ status: 200, description: 'Eligibility flags' })
  @SkipThrottle({ short: true, medium: true, long: true })
  @Post('drivers/check-eligibility')
  checkEligibility(@Body() body: CheckEligibilityDto): unknown {
    return this.cabinetService.checkEligibility(body);
  }

  @ApiOperation({ summary: 'Get a single driver by ID' })
  @ApiResponse({ status: 200, description: 'Driver record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('drivers/:id')
  getDriver(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.cabinetService.getDriver(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Update a driver record' })
  @ApiResponse({ status: 200, description: 'Driver updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('drivers/:id')
  updateDriver(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDriverDto,
  ): Promise<unknown> {
    return this.cabinetService.updateDriver(req.user.sub, id, body);
  }

  @ApiOperation({
    summary: 'Update driver-license fields used by course eligibility checks',
  })
  @ApiResponse({ status: 200, description: 'Driver license updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('drivers/:id/license')
  updateDriverLicense(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDriverLicenseDto,
  ): Promise<unknown> {
    return this.cabinetService.updateDriverLicense(req.user.sub, id, body);
  }

  @ApiOperation({ summary: 'Get the history of changes for a driver' })
  @ApiResponse({ status: 200, description: 'Driver history entries' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('drivers/:id/history')
  getDriverHistory(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.cabinetService.getDriverHistory(req.user.sub, id);
  }

  // ── Graduates ─────────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'List graduates for the current training center' })
  @ApiResponse({ status: 200, description: 'Paginated list of graduates' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('graduates')
  getGraduates(
    @Request() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = CabinetService.GRADUATES_ALLOWED;
    return this.cabinetService.getGraduates(
      req.user.sub,
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  // ── Study groups ─────────────────────────────────────────────────────────
  @ApiOperation({
    summary: 'List study groups for the current training center',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of study groups' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('study-groups')
  getStudyGroups(
    @Request() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('search') search?: string,
  ): Promise<unknown> {
    const allowed = CabinetService.GROUPS_ALLOWED;
    return this.cabinetService.getStudyGroups(
      req.user.sub,
      parsePage(page),
      parsePageSize(pageSize),
      parseSort(sort, order, allowed),
      parseSearch(search),
    );
  }

  @ApiOperation({ summary: 'Create a new study group' })
  @ApiResponse({ status: 201, description: 'Study group created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('study-groups')
  createStudyGroup(
    @Request() req: { user: JwtPayload },
    @Body() body: CreateStudyGroupDto,
  ): Promise<unknown> {
    return this.cabinetService.createStudyGroup(req.user.sub, body);
  }

  @ApiOperation({ summary: 'Get a single study group by ID' })
  @ApiResponse({ status: 200, description: 'Study group record with students' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('study-groups/:id')
  getStudyGroup(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.cabinetService.getStudyGroup(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Update a study group' })
  @ApiResponse({ status: 200, description: 'Study group updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('study-groups/:id')
  updateStudyGroup(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStudyGroupDto,
  ): Promise<unknown> {
    return this.cabinetService.updateStudyGroup(req.user.sub, id, body);
  }

  @ApiOperation({ summary: 'Delete a study group' })
  @ApiResponse({ status: 204, description: 'Study group deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete('study-groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStudyGroup(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.cabinetService.deleteStudyGroup(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Change the status of a study group' })
  @ApiResponse({ status: 200, description: 'Study group status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('study-groups/:id/status')
  changeStudyGroupStatus(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status', ParseIntPipe) status: number,
  ): Promise<unknown> {
    return this.cabinetService.changeStudyGroupStatus(req.user.sub, id, status);
  }

  // ── Study group: short course eligibility check ───────────────────────────
  @ApiOperation({
    summary: 'Validate short course eligibility for a study group',
  })
  @ApiResponse({
    status: 200,
    description: 'Eligibility check result per driver',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('study-groups/:id/eligibility')
  validateShortCourseEligibility(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    return this.cabinetService.validateShortCourseEligibility(req.user.sub, id);
  }

  // ── Study group: split by course type ────────────────────────────────────
  @ApiOperation({
    summary: 'Split a study group into full and short course subgroups',
  })
  @ApiResponse({
    status: 201,
    description: 'Group split successfully, returns new group',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('study-groups/:id/split')
  splitGroup(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SplitGroupDto,
  ): Promise<unknown> {
    return this.cabinetService.splitGroup(
      req.user.sub,
      id,
      body.blockedDriverIds,
    );
  }

  @ApiOperation({ summary: 'Set the course type for a study group' })
  @ApiResponse({ status: 200, description: 'Course type updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @Patch('study-groups/:id/course-type')
  setCourseType(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetCourseTypeDto,
  ): Promise<unknown> {
    return this.cabinetService.setCourseType(req.user.sub, id, body.courseType);
  }

  // ── Study group: available drivers search ─────────────────────────────────
  @ApiOperation({
    summary: 'Search drivers available to be added to a study group',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching available drivers',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('study-groups/:id/available-drivers')
  searchAvailableDrivers(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
    @Query('q') q: string,
  ): Promise<unknown> {
    return this.cabinetService.searchAvailableDrivers(
      req.user.sub,
      groupId,
      q ?? '',
    );
  }

  // ── Study group: students management ─────────────────────────────────────
  @ApiOperation({
    summary: 'Add an existing driver as a student to a study group',
  })
  @ApiResponse({ status: 204, description: 'Driver added to the group' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('study-groups/:id/students')
  @HttpCode(HttpStatus.NO_CONTENT)
  addStudent(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
    @Body('driverId', ParseIntPipe) driverId: number,
  ): Promise<unknown> {
    return this.cabinetService.addStudent(req.user.sub, groupId, driverId);
  }

  @ApiOperation({ summary: 'Remove a student from a study group' })
  @ApiResponse({ status: 204, description: 'Driver removed from the group' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete('study-groups/:id/students/:driverId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStudent(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
    @Param('driverId', ParseIntPipe) driverId: number,
  ): Promise<unknown> {
    return this.cabinetService.removeStudent(req.user.sub, groupId, driverId);
  }

  // ── Study group: create new driver and add ────────────────────────────────
  @ApiOperation({
    summary: 'Create a new driver and immediately add them to a study group',
  })
  @ApiResponse({
    status: 201,
    description: 'Driver created and added to the group',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('study-groups/:id/drivers')
  createAndAddDriver(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
    @Body() body: CreateDriverDto,
  ): Promise<unknown> {
    return this.cabinetService.createAndAddDriver(req.user.sub, groupId, body);
  }

  // ── Study group: SPK archive download (ZIP) ──────────────────────────────
  @ApiOperation({
    summary: 'Download SPK documents archive (ZIP) for a study group',
  })
  @ApiResponse({ status: 200, description: 'ZIP file containing SPK PDFs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('study-groups/:id/archive-spk')
  async getSpkArchive(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.cabinetService.getSpkArchive(
      req.user.sub,
      groupId,
    );
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── Study group: Personalization archive download (ZIP) ─────────────────
  @ApiOperation({
    summary: 'Download personalization archive (ZIP) for a study group',
  })
  @ApiResponse({
    status: 200,
    description: 'ZIP file containing personalization documents',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('study-groups/:id/archive-personalization')
  async getPersonalizationArchive(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } =
      await this.cabinetService.getPersonalizationArchive(
        req.user.sub,
        groupId,
      );
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── Study group: SPK archive data ─────────────────────────────────────────
  @ApiOperation({ summary: 'Get SPK data for all students in a study group' })
  @ApiResponse({ status: 200, description: 'SPK data per student' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('study-groups/:id/spk-data')
  getStudyGroupSpkData(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
  ): Promise<unknown> {
    return this.cabinetService.getStudyGroupSpkData(req.user.sub, groupId);
  }

  // ── SPK creation (bulk for selected drivers in a group) ───────────────────
  @ApiOperation({
    summary: 'Create SPK records in bulk for selected drivers in a study group',
  })
  @ApiResponse({ status: 201, description: 'SPK records created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('study-groups/:id/spk')
  createSpkBulk(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
    @Body() body: CreateSpkBulkDto,
  ): Promise<unknown> {
    return this.cabinetService.createSpkBulk(
      req.user.sub,
      groupId,
      body.driverIds,
      {
        carryTypeId: body.carryTypeId,
        dateOfTest: body.dateOfTest,
        dateOfTestProtocol: body.dateOfTestProtocol,
        testProtocolNo: body.testProtocolNo,
        dateOfExpiry: body.dateOfExpiry,
        position: body.position,
        chiefPip: body.chiefPip,
      },
    );
  }

  // ── Driver ECard pre-fill data ────────────────────────────────────────────
  @ApiOperation({
    summary: 'Get pre-fill data for creating an e-card for a driver',
  })
  @ApiResponse({
    status: 200,
    description: 'Pre-fill data for the e-card form',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('drivers/:id/ecard-prefill')
  getDriverEcardPrefill(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) driverId: number,
  ): Promise<unknown> {
    return this.cabinetService.getDriverEcardPrefill(req.user.sub, driverId);
  }

  // ── ECard creation ────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'Create an e-card for a driver' })
  @ApiResponse({ status: 201, description: 'E-card created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('drivers/:id/ecard')
  createECard(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) driverId: number,
    @Body() body: CreateECardDto,
  ): Promise<unknown> {
    return this.cabinetService.createECard(req.user.sub, driverId, body);
  }

  // ── Study group: Excel import ─────────────────────────────────────────────
  @ApiOperation({
    summary: 'Import drivers into a study group from an Excel file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Drivers imported successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('study-groups/:id/import-excel')
  @UseInterceptors(FileInterceptor('file'))
  importDriversFromExcel(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseUUIDPipe) groupId: string,
    @UploadedFile() file: { buffer: Buffer },
  ): Promise<unknown> {
    return this.cabinetService.importDriversFromExcel(
      req.user.sub,
      groupId,
      file.buffer,
    );
  }

  // ── SPK detail ────────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'Get SPK record by ID' })
  @ApiResponse({ status: 200, description: 'SPK record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('espk/:id')
  getSpk(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.cabinetService.getSpk(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Update an SPK record' })
  @ApiResponse({ status: 200, description: 'SPK updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('espk/:id')
  updateSpk(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpkDto,
  ): Promise<unknown> {
    return this.cabinetService.updateSpk(req.user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Download SPK as PDF' })
  @ApiResponse({ status: 200, description: 'PDF file of the SPK document' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('espk/:id/pdf')
  async getSpkPdf(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.cabinetService.getSpkPdf(req.user.sub, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="spk-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // ── ECard detail ──────────────────────────────────────────────────────────
  @ApiOperation({ summary: 'Get e-card record by ID' })
  @ApiResponse({ status: 200, description: 'E-card record' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('ecards/:id')
  getECard(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<unknown> {
    return this.cabinetService.getECard(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Update an e-card record' })
  @ApiResponse({ status: 200, description: 'E-card updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('ecards/:id')
  updateECard(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateECardDto,
  ): Promise<unknown> {
    return this.cabinetService.updateECard(req.user.sub, id, dto);
  }

  // ── Driver file upload (photo | signature) ───────────────────────────────
  @ApiOperation({ summary: 'Upload a photo or signature image for a driver' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('drivers/:id/upload/:field')
  @UseInterceptors(FileInterceptor('file'))
  uploadDriverFile(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) driverId: number,
    @Param('field') field: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: STORAGE_MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<unknown> {
    return this.cabinetService.uploadDriverFile(
      req.user.sub,
      driverId,
      field,
      file,
    );
  }

  // ── ECard file upload (photo | signature) ─────────────────────────────────
  @ApiOperation({ summary: 'Upload a photo or signature image for an e-card' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('ecards/:id/upload/:field')
  @UseInterceptors(FileInterceptor('file'))
  uploadEcardFile(
    @Request() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) ecardId: number,
    @Param('field') field: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: STORAGE_MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<unknown> {
    return this.cabinetService.uploadEcardFile(
      req.user.sub,
      ecardId,
      field,
      file,
    );
  }
}
