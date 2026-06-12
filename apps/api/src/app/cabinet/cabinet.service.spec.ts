import { Test } from '@nestjs/testing';
import { DataSource, type Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CourseType } from '@code95/shared-types';
import { CabinetService } from './cabinet.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import {
  createMockRepository,
  createMockQueryBuilder,
} from '../../test-helpers/mock-repository';

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

/* ── Shared mock helpers ─────────────────────────────────────────────── */

type MockRepo<T> = { [K in keyof Repository<T>]: jest.Mock };

const USER_ID = '550e8400-e29b-41d4-a716-446655440010';
const TC_ID = '550e8400-e29b-41d4-a716-446655440100';
const GROUP_ID = '550e8400-e29b-41d4-a716-446655440001';
const GROUP_ID_NOT_FOUND = '550e8400-e29b-41d4-a716-446655440099';

/**
 * Helper: build a TC entity-like object for `tcRepo.findOne`.
 */
function makeTcEntity(
  overrides: Partial<TrainingCenter> = {},
): Partial<TrainingCenter> {
  return {
    id: TC_ID,
    name: 'TC',
    nameShort: 'TC',
    edrpou: '12345678',
    certNo: 'UA-001',
    certDate: null,
    region: null,
    city: 'Kyiv',
    addrStreet: 'St',
    addrHouse: '1',
    postCode: null,
    phone: null,
    email: null,
    website: null,
    chiefPip: 'Chief',
    isActive: true,
    ...overrides,
  };
}

/* ── Test Suite ───────────────────────────────────────────────────────── */

describe('CabinetService — BPMN business flows', () => {
  let service: CabinetService;
  let tceRepo: MockRepo<TrainingCenterEmployee>;
  let tcRepo: MockRepo<TrainingCenter>;
  let sgRepo: MockRepo<StudyGroup>;
  let sgsRepo: MockRepo<StudyGroupStudent>;
  let sgLogRepo: MockRepo<StudyGroupLog>;
  let driverRepo: MockRepo<EDriver>;
  let spkRepo: MockRepo<ESPK>;
  let cardRepo: MockRepo<ECard>;
  let registryRepo: MockRepo<EDriverRegistry>;
  let carryTypeRepo: MockRepo<ECarryType>;
  let constantRepo: MockRepo<EConstant>;
  let countryRepo: MockRepo<ECountry>;
  let sgtRepo: MockRepo<StudyGroupType>;
  let ds: { query: jest.Mock; transaction: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    tceRepo =
      createMockRepository<TrainingCenterEmployee>() as unknown as MockRepo<TrainingCenterEmployee>;
    tcRepo =
      createMockRepository<TrainingCenter>() as unknown as MockRepo<TrainingCenter>;
    sgRepo =
      createMockRepository<StudyGroup>() as unknown as MockRepo<StudyGroup>;
    sgsRepo =
      createMockRepository<StudyGroupStudent>() as unknown as MockRepo<StudyGroupStudent>;
    sgLogRepo =
      createMockRepository<StudyGroupLog>() as unknown as MockRepo<StudyGroupLog>;
    driverRepo =
      createMockRepository<EDriver>() as unknown as MockRepo<EDriver>;
    spkRepo = createMockRepository<ESPK>() as unknown as MockRepo<ESPK>;
    cardRepo = createMockRepository<ECard>() as unknown as MockRepo<ECard>;
    registryRepo =
      createMockRepository<EDriverRegistry>() as unknown as MockRepo<EDriverRegistry>;
    carryTypeRepo =
      createMockRepository<ECarryType>() as unknown as MockRepo<ECarryType>;
    constantRepo =
      createMockRepository<EConstant>() as unknown as MockRepo<EConstant>;
    countryRepo =
      createMockRepository<ECountry>() as unknown as MockRepo<ECountry>;
    sgtRepo =
      createMockRepository<StudyGroupType>() as unknown as MockRepo<StudyGroupType>;
    // EntityManager mock handed to `dataSource.transaction` callbacks.
    // Delegates to the matching repo mocks so per-test expectations on
    // spkRepo/cardRepo/driverRepo/registryRepo keep working.
    const em = {
      findOne: jest.fn((entity: unknown, options: unknown) =>
        entity === TrainingCenter
          ? tcRepo.findOne(options)
          : Promise.resolve(null),
      ),
      count: jest.fn((entity: unknown, options: unknown) =>
        entity === ESPK ? spkRepo.count(options) : Promise.resolve(0),
      ),
      create: jest.fn((entity: unknown, data: Record<string, unknown>) =>
        entity === EDriverRegistry
          ? registryRepo.create(data)
          : spkRepo.create(data),
      ),
      save: jest.fn((entity: Record<string, unknown>) =>
        'spkNo' in entity ? spkRepo.save(entity) : cardRepo.save(entity),
      ),
      update: jest.fn((entity: unknown, id: unknown, data: unknown) =>
        entity === EDriver
          ? driverRepo.update(id, data)
          : Promise.resolve(undefined),
      ),
      delete: jest.fn((entity: unknown, criteria: unknown) =>
        entity === EDriverRegistry
          ? registryRepo.delete(criteria)
          : Promise.resolve(undefined),
      ),
      upsert: jest.fn((entity: unknown, data: unknown, options: unknown) =>
        entity === EDriverRegistry
          ? registryRepo.upsert(data, options)
          : Promise.resolve(undefined),
      ),
    };
    ds = {
      query: jest.fn(),
      transaction: jest.fn((cb: (manager: typeof em) => Promise<unknown>) =>
        cb(em),
      ),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const mod = await Test.createTestingModule({
      providers: [
        CabinetService,
        { provide: DataSource, useValue: ds },
        {
          provide: getRepositoryToken(TrainingCenterEmployee),
          useValue: tceRepo,
        },
        { provide: getRepositoryToken(TrainingCenter), useValue: tcRepo },
        { provide: getRepositoryToken(StudyGroup), useValue: sgRepo },
        { provide: getRepositoryToken(StudyGroupStudent), useValue: sgsRepo },
        { provide: getRepositoryToken(StudyGroupLog), useValue: sgLogRepo },
        { provide: getRepositoryToken(EDriver), useValue: driverRepo },
        { provide: getRepositoryToken(ESPK), useValue: spkRepo },
        { provide: getRepositoryToken(ECard), useValue: cardRepo },
        {
          provide: getRepositoryToken(EDriverRegistry),
          useValue: registryRepo,
        },
        { provide: getRepositoryToken(ECarryType), useValue: carryTypeRepo },
        { provide: getRepositoryToken(EConstant), useValue: constantRepo },
        { provide: getRepositoryToken(ECountry), useValue: countryRepo },
        { provide: getRepositoryToken(StudyGroupType), useValue: sgtRepo },
        {
          provide: StorageService,
          useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() },
        },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = mod.get(CabinetService);
  });

  /** Shorthand: mock getTcId to return TC_ID */
  function mockTcId() {
    tceRepo.findOne.mockResolvedValue({ trainingCenterId: TC_ID });
  }

  /** Shorthand: mock getTcId to return null (user has no TC) */
  function mockNoTcId() {
    tceRepo.findOne.mockResolvedValue(null);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     Helper functions
     ═══════════════════════════════════════════════════════════════════════ */

  describe('mapDate (private, tested indirectly via getStudyGroup students)', () => {
    /** Helper: sets up getStudyGroup mocks with one student that has a given dateOfBirth */
    function setupStudyGroupWithStudent(dateOfBirth: unknown) {
      mockTcId();

      const sgQb = createMockQueryBuilder();
      sgQb.getRawAndEntities.mockResolvedValue({
        entities: [
          {
            id: 1,
            name: 'G1',
            dateStart: null,
            dateFinish: null,
            status: 1,
            carryTypeId: null,
            groupTypeId: null,
          },
        ],
        raw: [
          {
            tcName: 'TC',
            tcCertNo: '123',
            tcChiefPip: 'PIP',
            carryTypeName: null,
            groupTypeName: null,
          },
        ],
      });
      sgRepo.createQueryBuilder.mockReturnValue(sgQb);

      const driverQb = createMockQueryBuilder();
      driverQb.getMany.mockResolvedValue([
        {
          id: 10,
          surname: 'S',
          firstName: 'F',
          middleName: 'M',
          taxNumber: '1',
          dateOfBirth,
          phone: null,
          email: null,
          idEspk: null,
          idCard: null,
        },
      ]);
      driverRepo.createQueryBuilder.mockReturnValue(driverQb);
    }

    it('formats Date objects to YYYY-MM-DD', async () => {
      const dateValue = new Date('2025-03-15T00:00:00Z');
      setupStudyGroupWithStudent(dateValue);

      const result = await service.getStudyGroup(USER_ID, GROUP_ID);
      expect(result.students[0].dateOfBirth).toBe('2025-03-15');
    });

    it('trims ISO timestamps to date-only', async () => {
      setupStudyGroupWithStudent('2025-06-01T12:00:00Z');

      const result = await service.getStudyGroup(USER_ID, GROUP_ID);
      expect(result.students[0].dateOfBirth).toBe('2025-06-01');
    });

    it('returns null for null/undefined', async () => {
      setupStudyGroupWithStudent(null);

      const result = await service.getStudyGroup(USER_ID, GROUP_ID);
      expect(result.students[0].dateOfBirth).toBeNull();
    });
  });

  describe('SPK driver name snapshot (via createSpkBulk)', () => {
    /** Sets up all mocks needed for a single-driver createSpkBulk call with null carryType */
    function setupSpkBulkMocks(
      driver: Partial<EDriver>,
      tcOverrides: Partial<TrainingCenter> = {},
    ) {
      mockTcId();
      // group with null carry_type
      sgRepo.findOne.mockResolvedValue({
        id: 1,
        carryTypeId: null,
        trainingCenterId: TC_ID,
      });
      // tc
      const tc = makeTcEntity({
        certNo: 'UA-001',
        chiefPip: 'Chief',
        ...tcOverrides,
      });
      tcRepo.findOne.mockResolvedValue(tc);
      // constants
      constantRepo.findOne.mockResolvedValue({
        dateOfMiniinfra: null,
        miniinfraNo: '',
        dateOfMinjust: null,
        minjustNo: '',
      });
      // driver
      driverRepo.findOne.mockResolvedValue({
        id: driver.id ?? 1,
        surname: driver.surname ?? 'Test',
        firstName: driver.firstName ?? 'User',
        middleName: driver.middleName ?? '',
        dateOfBirth: driver.dateOfBirth ?? null,
        tcId: TC_ID,
        ...driver,
      });
      // save SPK
      spkRepo.create.mockImplementation((e: Record<string, unknown>) => e);
      spkRepo.save.mockImplementation((e: Record<string, unknown>) =>
        Promise.resolve({ ...e, id: 50 }),
      );
    }

    it('stores the full legal name (Django parity: driver_pip_full)', async () => {
      setupSpkBulkMocks({
        id: 1,
        surname: 'Іванов',
        firstName: 'Петро',
        middleName: 'Сергійович',
      });

      const results = await service.createSpkBulk(USER_ID, GROUP_ID, [1], {
        dateOfTest: '2025-01-01',
        dateOfTestProtocol: '2025-01-01',
        testProtocolNo: 'P-001',
        dateOfExpiry: '2030-01-01',
      });

      expect(results[0].driverPip).toBe('Іванов Петро Сергійович');
    });

    it('uses full first name when middle name is empty', async () => {
      setupSpkBulkMocks({
        id: 2,
        surname: 'Doe',
        firstName: 'John',
        middleName: '',
      });

      const results = await service.createSpkBulk(USER_ID, GROUP_ID, [2], {
        dateOfTest: '2025-01-01',
        dateOfTestProtocol: '2025-01-01',
        testProtocolNo: 'P-002',
        dateOfExpiry: '2030-01-01',
      });

      expect(results[0].driverPip).toBe('Doe John');
    });

    it('rejects SPK creation when ministry constants are missing', async () => {
      setupSpkBulkMocks({
        id: 3,
        surname: 'Doe',
        firstName: 'John',
        middleName: '',
      });
      constantRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createSpkBulk(USER_ID, GROUP_ID, [3], {
          dateOfTest: '2025-01-01',
          dateOfTestProtocol: '2025-01-01',
          testProtocolNo: 'P-003',
        }),
      ).rejects.toThrow('Ministry constants are not configured');
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
     BPMN Flow 1: Course (Study Group) Lifecycle
     Status codes: 1=Open enrollment, 2=Enrollment complete, 3=Training,
                   4=Completed, 5=Cancelled
     ═══════════════════════════════════════════════════════════════════════ */

  describe('Flow 1: Course lifecycle', () => {
    describe('createStudyGroup', () => {
      it('creates group with initial status 1 (Open enrollment)', async () => {
        mockTcId();

        sgRepo.create.mockReturnValue({
          name: 'Group A',
          trainingCenterId: TC_ID,
          carryTypeId: 2,
          groupTypeId: 3,
          dateStart: '2025-03-01',
          dateFinish: '2025-06-01',
          status: 1,
        });
        sgRepo.save.mockResolvedValue({
          id: 1,
          name: 'Group A',
          dateStart: '2025-03-01',
          dateFinish: '2025-06-01',
          status: 1,
          carryTypeId: 2,
          groupTypeId: 3,
          trainingCenterId: TC_ID,
        });

        const result = await service.createStudyGroup(USER_ID, {
          name: 'Group A',
          carryTypeId: 2,
          groupTypeId: '3',
          dateStart: '2025-03-01',
          dateFinish: '2025-06-01',
        });

        expect(result.status).toBe(1);
        expect(result.name).toBe('Group A');

        // Verify create was called with status=1
        expect(sgRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ status: 1 }),
        );
        expect(sgRepo.save).toHaveBeenCalled();
      });

      it('persists courseType when provided', async () => {
        mockTcId();

        sgRepo.create.mockReturnValue({
          name: 'Periodic Group',
          trainingCenterId: TC_ID,
          carryTypeId: 1,
          groupTypeId: null,
          dateStart: null,
          dateFinish: null,
          courseType: 'periodic',
          status: 1,
        });
        sgRepo.save.mockResolvedValue({
          id: 'uuid-1',
          name: 'Periodic Group',
          dateStart: null,
          dateFinish: null,
          status: 1,
          carryTypeId: 1,
          groupTypeId: null,
          courseType: 'periodic',
          trainingCenterId: TC_ID,
        });

        const result = await service.createStudyGroup(USER_ID, {
          name: 'Periodic Group',
          carryTypeId: 1,
          courseType: CourseType.PERIODIC,
        });

        expect(result.courseType).toBe('periodic');
        expect(sgRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ courseType: 'periodic' }),
        );
      });

      it('throws ForbiddenException when user has no training center', async () => {
        mockNoTcId();

        await expect(
          service.createStudyGroup(USER_ID, { name: 'X' }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('changeStudyGroupStatus', () => {
      it('transitions group to new status', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'G1',
          status: 2,
          trainingCenterId: TC_ID,
        });
        sgRepo.findOneOrFail.mockResolvedValue({
          id: 1,
          name: 'G1',
          dateStart: null,
          dateFinish: null,
          status: 3,
          carryTypeId: null,
          groupTypeId: null,
          trainingCenterId: TC_ID,
        });

        const result = await service.changeStudyGroupStatus(
          USER_ID,
          GROUP_ID,
          3,
        );
        expect(result.status).toBe(3);

        // Verify update was called with new status and correct group id
        expect(sgRepo.update).toHaveBeenCalledWith(GROUP_ID, { status: 3 });
      });

      it('throws NotFoundException when group does not belong to TC', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.changeStudyGroupStatus(USER_ID, GROUP_ID_NOT_FOUND, 2),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws ForbiddenException when user has no TC', async () => {
        mockNoTcId();

        await expect(
          service.changeStudyGroupStatus(USER_ID, GROUP_ID, 2),
        ).rejects.toThrow(ForbiddenException);
      });

      it('throws BadRequestException when transitioning INITIAL_SHORTENED group to IN_PROCESS with an ineligible driver', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'Shortened Group',
          status: 2,
          courseType: 'initial_shortened',
          carryTypeId: 1,
          trainingCenterId: TC_ID,
        });

        sgsRepo.find.mockResolvedValue([
          { studygroupId: GROUP_ID, edriverId: 42 },
        ]);
        // Driver has no license categories at all → fails eligibility.
        driverRepo.findOne.mockResolvedValue({
          id: 42,
          surname: 'Test',
          firstName: 'Driver',
          middleName: 'Mid',
          driverLicenseCategories: null,
          driverLicenseIssueDate: null,
          driverLicenseExpiryDate: null,
          intendsUrbanSuburbanRoute: false,
        });
        const spkQb = createMockQueryBuilder();
        spkQb.getOne.mockResolvedValue(null); // no prior valid SPK
        spkRepo.createQueryBuilder.mockReturnValue(spkQb);

        await expect(
          service.changeStudyGroupStatus(USER_ID, GROUP_ID, 3),
        ).rejects.toThrow(BadRequestException);
      });

      it('allows transitioning INITIAL group to IN_PROCESS when all drivers hold matching license categories', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          name: 'Initial Group',
          status: 2,
          courseType: 'initial',
          carryTypeId: 1,
          trainingCenterId: TC_ID,
        });
        sgRepo.findOneOrFail.mockResolvedValue({
          id: 1,
          name: 'Initial Group',
          dateStart: null,
          dateFinish: null,
          status: 3,
          courseType: 'initial',
          carryTypeId: 1,
          groupTypeId: null,
          trainingCenterId: TC_ID,
        });

        sgsRepo.find.mockResolvedValue([
          { studygroupId: GROUP_ID, edriverId: 42 },
        ]);
        driverRepo.findOne.mockResolvedValue({
          id: 42,
          surname: 'Test',
          firstName: 'Driver',
          middleName: 'Mid',
          driverLicenseCategories: 'C,CE',
          driverLicenseIssueDate: '2010-01-01',
          driverLicenseExpiryDate: '2030-01-01',
          intendsUrbanSuburbanRoute: false,
        });
        const spkQb = createMockQueryBuilder();
        spkQb.getOne.mockResolvedValue(null);
        spkRepo.createQueryBuilder.mockReturnValue(spkQb);

        const result = await service.changeStudyGroupStatus(
          USER_ID,
          GROUP_ID,
          3,
        );
        expect(result.status).toBe(3);
      });
    });

    describe('deleteStudyGroup', () => {
      it('deletes students first, then the group', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        await service.deleteStudyGroup(USER_ID, GROUP_ID);

        // Verify students are deleted first, then the group
        expect(sgsRepo.delete).toHaveBeenCalledWith({ studygroupId: GROUP_ID });
        expect(sgRepo.delete).toHaveBeenCalledWith(GROUP_ID);

        // Verify order: sgsRepo.delete called before sgRepo.delete
        const sgsDeleteOrder = sgsRepo.delete.mock.invocationCallOrder[0];
        const sgDeleteOrder = sgRepo.delete.mock.invocationCallOrder[0];
        expect(sgsDeleteOrder).toBeLessThan(sgDeleteOrder);
      });

      it('throws NotFoundException for non-existent group', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteStudyGroup(USER_ID, GROUP_ID_NOT_FOUND),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getDashboard — stats aggregation', () => {
      it('aggregates status counts correctly (1+2=inEnrollment, 3=inProcess, 4=completed, 5=canceled)', async () => {
        mockTcId();
        tcRepo.findOne.mockResolvedValue(makeTcEntity());

        // Stats query builder
        const statsQb = createMockQueryBuilder();
        statsQb.getRawMany.mockResolvedValue([
          { status: 1, cnt: '3' },
          { status: 2, cnt: '2' },
          { status: 3, cnt: '7' },
          { status: 4, cnt: '10' },
          { status: 5, cnt: '1' },
        ]);
        sgRepo.createQueryBuilder.mockReturnValue(statsQb);

        // Recent groups
        sgRepo.find.mockResolvedValue([]);

        const result = await service.getDashboard(USER_ID);
        expect(result).not.toBeNull();
        expect(result.stats).toEqual({
          inEnrollment: 5, // 3 + 2
          inProcess: 7,
          completed: 10,
          canceled: 1,
        });
      });

      it('returns null when user has no TC', async () => {
        mockNoTcId();
        const result = await service.getDashboard(USER_ID);
        expect(result).toBeNull();
      });
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
     BPMN Flow 2: Driver Enrollment
     Three paths: manual creation, Excel import, existing driver search
     ═══════════════════════════════════════════════════════════════════════ */

  describe('Flow 2: Driver enrollment', () => {
    describe('addStudent — add existing driver to group', () => {
      it('inserts driver-group association with ON CONFLICT DO NOTHING', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });
        driverRepo.findOne.mockResolvedValue({ id: 5, tcId: TC_ID });

        const sgsQb = createMockQueryBuilder();
        sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

        await service.addStudent(USER_ID, GROUP_ID, 5);

        // Verify the QueryBuilder chain: insert().into().values().orIgnore().execute()
        expect(sgsQb.insert).toHaveBeenCalled();
        expect(sgsQb.into).toHaveBeenCalledWith(StudyGroupStudent);
        expect(sgsQb.values).toHaveBeenCalledWith({
          studygroupId: GROUP_ID,
          edriverId: 5,
        });
        expect(sgsQb.orIgnore).toHaveBeenCalled();
        expect(sgsQb.execute).toHaveBeenCalled();
      });

      it('throws NotFoundException when group not found', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.addStudent(USER_ID, GROUP_ID_NOT_FOUND, 5),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws NotFoundException when driver not found', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });
        driverRepo.findOne.mockResolvedValue(null);

        await expect(
          service.addStudent(USER_ID, GROUP_ID, 999),
        ).rejects.toThrow(NotFoundException);
      });

      it('throws ForbiddenException when user has no TC', async () => {
        mockNoTcId();

        await expect(service.addStudent(USER_ID, GROUP_ID, 5)).rejects.toThrow(
          ForbiddenException,
        );
      });

      it('throws BadRequestException when group already has 25 students (Наказ 789, п.5)', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });
        driverRepo.findOne.mockResolvedValue({ id: 5, tcId: TC_ID });
        // candidate not yet a member, but group is at 25
        sgsRepo.findOne.mockResolvedValue(null);
        sgsRepo.count.mockResolvedValue(25);

        await expect(service.addStudent(USER_ID, GROUP_ID, 5)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('allows adding a driver who is already a member even when group is at the cap', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });
        driverRepo.findOne.mockResolvedValue({ id: 5, tcId: TC_ID });
        // candidate already a member → enforceMaxGroupSize short-circuits
        sgsRepo.findOne.mockResolvedValue({
          studygroupId: GROUP_ID,
          edriverId: 5,
        });

        const sgsQb = createMockQueryBuilder();
        sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

        await expect(
          service.addStudent(USER_ID, GROUP_ID, 5),
        ).resolves.toBeUndefined();
      });
    });

    describe('removeStudent', () => {
      it('deletes driver-group association', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        await service.removeStudent(USER_ID, GROUP_ID, 5);

        expect(sgsRepo.delete).toHaveBeenCalledWith({
          studygroupId: GROUP_ID,
          edriverId: 5,
        });
      });

      it('throws NotFoundException when group not in TC', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.removeStudent(USER_ID, GROUP_ID_NOT_FOUND, 5),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('createAndAddDriver — manual driver creation', () => {
      it('creates driver and adds to group in one flow', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        const driverEntity = {
          id: 20,
          surname: 'Петренко',
          firstName: 'Іван',
          middleName: 'Миколайович',
          taxNumber: '1234567890',
          dateOfBirth: '1990-05-15',
          phone: '+380991234567',
          email: 'test@test.com',
          statusId: 1,
          idEspk: null,
          idCard: null,
          tcId: TC_ID,
        };

        driverRepo.create.mockReturnValue(driverEntity);
        driverRepo.findOneOrFail.mockResolvedValue(driverEntity);

        const sgsQb = createMockQueryBuilder();
        sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

        const result = await service.createAndAddDriver(USER_ID, GROUP_ID, {
          surname: 'Петренко',
          firstName: 'Іван',
          middleName: 'Миколайович',
          taxNumber: '1234567890',
          dateOfBirth: '1990-05-15',
          phone: '+380991234567',
          email: 'test@test.com',
        });

        expect(result.id).toBe(20);
        expect(result.surname).toBe('Петренко');

        // Verify upsert was called (ON CONFLICT for tax_number dedup)
        expect(driverRepo.upsert).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ conflictPaths: ['taxNumber'] }),
        );

        // Verify student association via QueryBuilder
        expect(sgsQb.insert).toHaveBeenCalled();
        expect(sgsQb.into).toHaveBeenCalledWith(StudyGroupStudent);
        expect(sgsQb.values).toHaveBeenCalledWith({
          studygroupId: GROUP_ID,
          edriverId: 20,
        });
      });

      it('handles duplicate tax_number via ON CONFLICT DO UPDATE', async () => {
        // When tax_number already exists, upsert + findOneOrFail returns existing driver
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        const existingDriver = {
          id: 15,
          surname: 'Existing',
          firstName: 'Driver',
          middleName: 'Mid',
          taxNumber: '1234567890',
          dateOfBirth: null,
          phone: null,
          email: null,
          statusId: 1,
          idEspk: null,
          idCard: null,
          tcId: TC_ID,
        };

        driverRepo.create.mockReturnValue({
          surname: 'New',
          firstName: 'Name',
          middleName: 'Mid',
          taxNumber: '1234567890',
        });
        driverRepo.findOneOrFail.mockResolvedValue(existingDriver);

        const sgsQb = createMockQueryBuilder();
        sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

        const result = await service.createAndAddDriver(USER_ID, GROUP_ID, {
          surname: 'New',
          firstName: 'Name',
          middleName: 'Mid',
          taxNumber: '1234567890',
          email: 'new@example.com',
        });

        // Returns the existing driver's id
        expect(result.id).toBe(15);
      });

      it('throws NotFoundException when group not found', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.createAndAddDriver(USER_ID, GROUP_ID_NOT_FOUND, {
            surname: 'X',
            firstName: 'Y',
            middleName: 'Z',
            taxNumber: '1234567890',
            email: 'x@example.com',
          }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('searchAvailableDrivers', () => {
      it('returns drivers in TC but not yet in group, matching search query', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        const driverQb = createMockQueryBuilder();
        driverQb.getMany.mockResolvedValue([
          {
            id: 3,
            surname: 'Коваленко',
            firstName: 'Олена',
            middleName: 'Вікторівна',
            taxNumber: '9876543210',
            dateOfBirth: '1985-12-01',
            tcId: TC_ID,
          },
        ]);
        driverRepo.createQueryBuilder.mockReturnValue(driverQb);

        const results = await service.searchAvailableDrivers(
          USER_ID,
          GROUP_ID,
          'ковал',
        );

        expect(results).toHaveLength(1);
        expect(results[0].surname).toBe('Коваленко');

        // Verify the QB chain includes LIKE pattern and NOT IN subquery
        expect(driverQb.where).toHaveBeenCalled();
        expect(driverQb.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('NOT IN'),
          expect.objectContaining({ groupId: GROUP_ID }),
        );
        expect(driverQb.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('LIKE'),
          expect.objectContaining({ pattern: '%ковал%' }),
        );
      });

      it('excludes drivers already in the group via NOT IN subquery', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        const driverQb = createMockQueryBuilder();
        driverQb.getMany.mockResolvedValue([]);
        driverRepo.createQueryBuilder.mockReturnValue(driverQb);

        await service.searchAvailableDrivers(USER_ID, GROUP_ID, 'test');

        expect(driverQb.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('NOT IN'),
          expect.objectContaining({ groupId: GROUP_ID }),
        );
        expect(driverQb.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('study_group_students'),
          expect.anything(),
        );
      });
    });

    describe('importDriversFromExcel', () => {
      // We mock XLSX.read at the module level to avoid needing real Excel files
      const XLSX = jest.requireActual('xlsx');

      function buildExcelBuffer(rows: (string | number | null)[][]) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      }

      it('imports new drivers and adds them to group', async () => {
        const buffer = buildExcelBuffer([
          [
            'РНОКПП',
            'Прізвище',
            "Ім'я",
            'По батькові',
            'Форма звертання',
            'Контактний номер',
            'Email',
            'День народження',
            'Місяць народження',
            'Рік народження',
          ],
          [
            '1111111111',
            'Шевченко',
            'Тарас',
            'Григорович',
            '',
            '+380501234567',
            'tg@test.ua',
            '9',
            'березня',
            '1814',
          ],
        ]);

        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        // inGroup check → not in group
        const sgsQb = createMockQueryBuilder();
        sgsQb.getOne.mockResolvedValue(null);
        sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

        // existing driver check → doesn't exist
        driverRepo.findOne.mockResolvedValue(null);

        // INSERT new driver
        driverRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        driverRepo.save.mockResolvedValue({ id: 30 });

        // INSERT study_group_students
        sgsRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        sgsRepo.save.mockResolvedValue({});

        // Audit log persistence
        sgLogRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        sgLogRepo.save.mockResolvedValue({});

        const result = await service.importDriversFromExcel(
          USER_ID,
          GROUP_ID,
          buffer,
        );

        expect(result.imported).toBe(1);
        expect(result.skipped).toBe(0);
        expect(result.errors).toHaveLength(0);
      });

      it('skips drivers already in the group', async () => {
        const buffer = buildExcelBuffer([
          [
            'РНОКПП',
            'Прізвище',
            "Ім'я",
            'По батькові',
            'Форма звертання',
            'Контактний номер',
            'Email',
            'День народження',
            'Місяць народження',
            'Рік народження',
          ],
          ['2222222222', 'Existing', 'Driver', 'Mid', '', '', '', '', '', ''],
        ]);

        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        // inGroup check → already in group
        const sgsQb = createMockQueryBuilder();
        sgsQb.getOne.mockResolvedValue({ edriverId: 5, studygroupId: 1 });
        sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

        sgLogRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        sgLogRepo.save.mockResolvedValue({});

        const result = await service.importDriversFromExcel(
          USER_ID,
          GROUP_ID,
          buffer,
        );
        expect(result.imported).toBe(0);
        expect(result.skipped).toBe(1);
      });

      it('reuses existing driver when tax_number already in system', async () => {
        const buffer = buildExcelBuffer([
          [
            'РНОКПП',
            'Прізвище',
            "Ім'я",
            'По батькові',
            'Форма звертання',
            'Контактний номер',
            'Email',
            'День народження',
            'Місяць народження',
            'Рік народження',
          ],
          ['3333333333', 'Reuse', 'Me', 'Pal', '', '', '', '', '', ''],
        ]);

        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        // not in group
        const sgsQb = createMockQueryBuilder();
        sgsQb.getOne.mockResolvedValue(null);
        sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

        // existing driver in system
        driverRepo.findOne.mockResolvedValue({
          id: 77,
          taxNumber: '3333333333',
          tcId: TC_ID,
        });

        // INSERT study_group_students
        sgsRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        sgsRepo.save.mockResolvedValue({});

        sgLogRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        sgLogRepo.save.mockResolvedValue({});

        const result = await service.importDriversFromExcel(
          USER_ID,
          GROUP_ID,
          buffer,
        );
        expect(result.imported).toBe(1);

        // Verify it used existing driver id 77 for the association
        expect(sgsRepo.save).toHaveBeenCalled();
        expect(sgsRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ studygroupId: GROUP_ID, edriverId: 77 }),
        );
      });

      it('reports error for rows with missing required fields', async () => {
        const buffer = buildExcelBuffer([
          [
            'РНОКПП',
            'Прізвище',
            "Ім'я",
            'По батькові',
            'Форма звертання',
            'Контактний номер',
            'Email',
            'День народження',
            'Місяць народження',
            'Рік народження',
          ],
          ['', 'NoTax', 'Number', 'Here', '', '', '', '', '', ''], // missing taxNumber
          ['4444444444', '', 'NoSurname', 'Here', '', '', '', '', '', ''], // missing surname
        ]);

        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        sgLogRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        sgLogRepo.save.mockResolvedValue({});

        const result = await service.importDriversFromExcel(
          USER_ID,
          GROUP_ID,
          buffer,
        );
        expect(result.imported).toBe(0);
        expect(result.errors).toHaveLength(2);
        expect(result.errors[0]).toContain('Row 2');
        expect(result.errors[1]).toContain('Row 3');
      });

      it('parses Ukrainian month names into dates correctly', async () => {
        const buffer = buildExcelBuffer([
          [
            'РНОКПП',
            'Прізвище',
            "Ім'я",
            'По батькові',
            'Форма звертання',
            'Контактний номер',
            'Email',
            'День народження',
            'Місяць народження',
            'Рік народження',
          ],
          [
            '5555555555',
            'Test',
            'User',
            'Mid',
            '',
            '',
            '',
            '15',
            'грудня',
            '1990',
          ],
        ]);

        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          status: 1,
          trainingCenterId: TC_ID,
        });

        // not in group
        const sgsQb = createMockQueryBuilder();
        sgsQb.getOne.mockResolvedValue(null);
        sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

        // not existing
        driverRepo.findOne.mockResolvedValue(null);

        // INSERT new driver — capture the entity passed to save
        driverRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        driverRepo.save.mockResolvedValue({ id: 40 });

        // INSERT study_group_students
        sgsRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        sgsRepo.save.mockResolvedValue({});

        sgLogRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        sgLogRepo.save.mockResolvedValue({});

        await service.importDriversFromExcel(USER_ID, GROUP_ID, buffer);

        // Verify date_of_birth was parsed as 1990-12-15
        expect(driverRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ dateOfBirth: '1990-12-15' }),
        );
      });

      it('throws NotFoundException if group not found', async () => {
        const buffer = buildExcelBuffer([['H'], ['D']]);
        mockTcId();
        sgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.importDriversFromExcel(USER_ID, GROUP_ID_NOT_FOUND, buffer),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
     BPMN Flow 3: Certification — SPK generation & ECard creation
     ═══════════════════════════════════════════════════════════════════════ */

  describe('Flow 3: Certification', () => {
    describe('createSpkBulk — SPK generation', () => {
      const baseSPKPayload = {
        dateOfTest: '2025-06-01',
        dateOfTestProtocol: '2025-06-01',
        testProtocolNo: 'PROT-001',
        dateOfExpiry: '2030-06-01',
      };

      it('generates SPK number from TC cert_no + padded counter', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          carryTypeId: null,
          trainingCenterId: TC_ID,
        });

        const tc = makeTcEntity({
          certNo: 'UA-001',
          chiefPip: 'Director',
        });
        tcRepo.findOne.mockResolvedValue(tc);

        constantRepo.findOne.mockResolvedValue({
          dateOfMiniinfra: null,
          miniinfraNo: '',
          dateOfMinjust: null,
          minjustNo: '',
        });

        driverRepo.findOne.mockResolvedValue({
          id: 1,
          surname: 'A',
          firstName: 'B',
          middleName: 'C',
          dateOfBirth: null,
          tcId: TC_ID,
        });

        spkRepo.count.mockResolvedValue(41);
        spkRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        spkRepo.save.mockImplementation((e: Record<string, unknown>) =>
          Promise.resolve({ ...e, id: 100 }),
        );

        const results = await service.createSpkBulk(
          USER_ID,
          GROUP_ID,
          [1],
          baseSPKPayload,
        );

        expect(results).toHaveLength(1);
        expect(results[0].spkNo).toBe('UA-001-000042');
        expect(results[0].spkId).toBe(100);
        expect(results[0].error).toBeUndefined();
      });

      it('derives dateOfExpiry as dateOfTest + 5 years, ignoring client-supplied value (Наказ 789, п.27)', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          carryTypeId: null,
          trainingCenterId: TC_ID,
        });
        const tc = makeTcEntity({
          certNo: 'UA-001',
          chiefPip: 'Dir',
        });
        tcRepo.findOne.mockResolvedValue(tc);
        constantRepo.findOne.mockResolvedValue({
          dateOfMiniinfra: null,
          miniinfraNo: '',
          dateOfMinjust: null,
          minjustNo: '',
        });
        driverRepo.findOne.mockResolvedValue({
          id: 1,
          surname: 'A',
          firstName: 'B',
          middleName: 'C',
          dateOfBirth: null,
          tcId: TC_ID,
        });
        spkRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        spkRepo.save.mockImplementation((e: Record<string, unknown>) =>
          Promise.resolve({ ...e, id: 100 }),
        );

        await service.createSpkBulk(USER_ID, GROUP_ID, [1], {
          dateOfTest: '2025-06-01',
          dateOfTestProtocol: '2025-06-01',
          testProtocolNo: 'PROT-001',
          // Client tries to forge a 1-year expiry — must be ignored.
          dateOfExpiry: '2026-01-01',
        });

        const savedEntity = spkRepo.create.mock.calls[0][0] as Record<
          string,
          unknown
        >;
        expect(savedEntity.dateOfExpiry).toBe('2030-06-01');
      });

      it('clamps Feb-29 → Feb-28 when adding 5 years lands on a non-leap year', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          carryTypeId: null,
          trainingCenterId: TC_ID,
        });
        const tc = makeTcEntity({
          certNo: 'UA-001',
          chiefPip: 'Dir',
        });
        tcRepo.findOne.mockResolvedValue(tc);
        constantRepo.findOne.mockResolvedValue({
          dateOfMiniinfra: null,
          miniinfraNo: '',
          dateOfMinjust: null,
          minjustNo: '',
        });
        driverRepo.findOne.mockResolvedValue({
          id: 1,
          surname: 'A',
          firstName: 'B',
          middleName: 'C',
          dateOfBirth: null,
          tcId: TC_ID,
        });
        spkRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        spkRepo.save.mockImplementation((e: Record<string, unknown>) =>
          Promise.resolve({ ...e, id: 100 }),
        );

        // 2024-02-29 (leap) + 5y → 2029 is not a leap year → clamp to 2029-02-28
        await service.createSpkBulk(USER_ID, GROUP_ID, [1], {
          dateOfTest: '2024-02-29',
          dateOfTestProtocol: '2024-02-29',
          testProtocolNo: 'PROT-LEAP',
        });

        const savedEntity = spkRepo.create.mock.calls[0][0] as Record<
          string,
          unknown
        >;
        expect(savedEntity.dateOfExpiry).toBe('2029-02-28');
      });

      it('rejects driver with same carry type SPK within 90 days', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          carryTypeId: 2,
          trainingCenterId: TC_ID,
        });

        const tc = makeTcEntity({
          certNo: 'UA-001',
          chiefPip: 'Dir',
        });
        tcRepo.findOne.mockResolvedValue(tc);

        constantRepo.findOne.mockResolvedValue({
          dateOfMiniinfra: null,
          miniinfraNo: '',
          dateOfMinjust: null,
          minjustNo: '',
        });

        // carryType name lookup
        carryTypeRepo.findOne.mockResolvedValue({
          id: 2,
          name: 'C1E',
          nameSpk: 'C1E',
        });

        // driver
        driverRepo.findOne.mockResolvedValue({
          id: 1,
          surname: 'X',
          firstName: 'Y',
          middleName: 'Z',
          dateOfBirth: null,
          tcId: TC_ID,
        });

        // 90-day duplicate check → found existing SPK
        spkRepo.findOne.mockResolvedValue({ id: 55 });

        const results = await service.createSpkBulk(USER_ID, GROUP_ID, [1], {
          ...baseSPKPayload,
          carryTypeId: 2,
        });

        expect(results).toHaveLength(1);
        expect(results[0].error).toContain('90 days');
        expect(results[0].spkId).toBe(0);
      });

      it('skips 90-day check when carryTypeId is null', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          carryTypeId: null,
          trainingCenterId: TC_ID,
        });

        const tc = makeTcEntity({
          certNo: 'UA-002',
          chiefPip: 'Dir',
        });
        tcRepo.findOne.mockResolvedValue(tc);

        constantRepo.findOne.mockResolvedValue({
          dateOfMiniinfra: null,
          miniinfraNo: '',
          dateOfMinjust: null,
          minjustNo: '',
        });

        driverRepo.findOne.mockResolvedValue({
          id: 2,
          surname: 'A',
          firstName: 'B',
          middleName: 'C',
          dateOfBirth: null,
          tcId: TC_ID,
        });

        spkRepo.count.mockResolvedValue(5);
        spkRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        spkRepo.save.mockImplementation((e: Record<string, unknown>) =>
          Promise.resolve({ ...e, id: 200 }),
        );

        const results = await service.createSpkBulk(USER_ID, GROUP_ID, [2], {
          ...baseSPKPayload,
          carryTypeId: null,
        });

        expect(results[0].spkNo).toBe('UA-002-000006');
        expect(results[0].error).toBeUndefined();

        // Verify spkRepo.findOne was NOT called (no 90-day check)
        expect(spkRepo.findOne).not.toHaveBeenCalled();
      });

      it('reports error for non-existent driver and continues processing', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          carryTypeId: null,
          trainingCenterId: TC_ID,
        });

        const tc = makeTcEntity({
          certNo: 'UA-001',
          chiefPip: 'Dir',
        });
        tcRepo.findOne.mockResolvedValue(tc);

        constantRepo.findOne.mockResolvedValue({
          dateOfMiniinfra: null,
          miniinfraNo: '',
          dateOfMinjust: null,
          minjustNo: '',
        });

        // driver 999: not found; driver 2: found
        driverRepo.findOne
          .mockResolvedValueOnce(null) // driver 999 not found
          .mockResolvedValueOnce({
            id: 2,
            surname: 'OK',
            firstName: 'Driver',
            middleName: 'X',
            dateOfBirth: null,
            tcId: TC_ID,
          });

        spkRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        spkRepo.save.mockImplementation((e: Record<string, unknown>) =>
          Promise.resolve({ ...e, id: 300 }),
        );

        const results = await service.createSpkBulk(
          USER_ID,
          GROUP_ID,
          [999, 2],
          baseSPKPayload,
        );

        expect(results).toHaveLength(2);
        expect(results[0].error).toBe('Driver not found');
        expect(results[0].driverPip).toBe('');
        expect(results[1].error).toBeUndefined();
        expect(results[1].spkId).toBe(300);
      });

      it('updates driver status_id to 3 after SPK creation', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          carryTypeId: null,
          trainingCenterId: TC_ID,
        });

        const tc = makeTcEntity({
          certNo: 'C-1',
          chiefPip: 'Dir',
        });
        tcRepo.findOne.mockResolvedValue(tc);

        constantRepo.findOne.mockResolvedValue({
          dateOfMiniinfra: null,
          miniinfraNo: '',
          dateOfMinjust: null,
          minjustNo: '',
        });

        driverRepo.findOne.mockResolvedValue({
          id: 7,
          surname: 'A',
          firstName: 'B',
          middleName: 'C',
          dateOfBirth: null,
          tcId: TC_ID,
        });

        spkRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        spkRepo.save.mockImplementation((e: Record<string, unknown>) =>
          Promise.resolve({ ...e, id: 500 }),
        );

        await service.createSpkBulk(USER_ID, GROUP_ID, [7], baseSPKPayload);

        // Verify driver update with idEspk and statusId (a fresh SPK also
        // clears the superseded card link)
        expect(driverRepo.update).toHaveBeenCalledWith(7, {
          idEspk: 500,
          idCard: null,
          statusId: 3,
        });
      });

      it('uses default position "Директор" and TC chief_pip when not provided', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue({
          id: 1,
          carryTypeId: null,
          trainingCenterId: TC_ID,
        });

        const tc = makeTcEntity({
          certNo: 'C-1',
          chiefPip: 'Іванов І.І.',
        });
        tcRepo.findOne.mockResolvedValue(tc);

        constantRepo.findOne.mockResolvedValue({
          dateOfMiniinfra: null,
          miniinfraNo: '',
          dateOfMinjust: null,
          minjustNo: '',
        });

        driverRepo.findOne.mockResolvedValue({
          id: 1,
          surname: 'A',
          firstName: 'B',
          middleName: 'C',
          dateOfBirth: null,
          tcId: TC_ID,
        });

        spkRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        spkRepo.save.mockImplementation((e: Record<string, unknown>) =>
          Promise.resolve({ ...e, id: 600 }),
        );

        await service.createSpkBulk(USER_ID, GROUP_ID, [1], baseSPKPayload);

        // Verify spkRepo.create was called with position and chiefPip defaults
        expect(spkRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            position: 'Директор',
            chiefPip: 'Іванов І.І.',
          }),
        );
      });

      it('throws ForbiddenException when user has no TC', async () => {
        mockNoTcId();

        await expect(
          service.createSpkBulk(USER_ID, GROUP_ID, [1], baseSPKPayload),
        ).rejects.toThrow(ForbiddenException);
      });

      it('throws NotFoundException when group not found', async () => {
        mockTcId();
        sgRepo.findOne.mockResolvedValue(null);

        await expect(
          service.createSpkBulk(
            USER_ID,
            GROUP_ID_NOT_FOUND,
            [1],
            baseSPKPayload,
          ),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('createECard', () => {
      const baseECardPayload = {
        surnameTranslit: 'IVANOV',
        firstNameTranslit: 'PETRO',
        photoImg: 'p.jpg',
        signImg: 's.jpg',
      };

      function setupECardMocks(
        driverOverrides: Record<string, unknown> = {},
        rawOverrides: Record<string, unknown> = {},
        spkOverrides: Record<string, unknown> = {},
      ) {
        mockTcId();

        const driver = {
          id: 1,
          surname: 'Іванов',
          firstName: 'Петро',
          middleName: 'Сергійович',
          dateOfBirth: '1990-05-15',
          idEspk: 50,
          tcId: TC_ID,
          ...driverOverrides,
        };

        const raw = {
          spkNo: 'UA-001-000001',
          eDateOfExpiry: '2030-06-01',
          eCarryTypeId: 2,
          eCarryTypeTxt: 'C1E',
          ...rawOverrides,
        };

        const driverQb = createMockQueryBuilder();
        driverQb.getRawAndEntities.mockResolvedValue({
          entities: [driver],
          raw: [raw],
        });
        driverRepo.createQueryBuilder.mockReturnValue(driverQb);

        tcRepo.findOne.mockResolvedValue({ nameShort: 'Training Center' });

        // Latest SPK anchors ECard issue/expiry (Наказ 789, п.27).
        // Default: dateOfTest = 2025-06-01 → expiry = 2030-06-01.
        spkRepo.findOne.mockResolvedValue({
          id: 50,
          driverId: 1,
          dateOfTest: '2025-06-01',
          ...spkOverrides,
        });

        // No duplicate ECard with same serial+licence.
        cardRepo.findOne.mockResolvedValue(null);

        cardRepo.create.mockImplementation((e: Record<string, unknown>) => e);
        cardRepo.save.mockImplementation((e: Record<string, unknown>) =>
          Promise.resolve({
            ...e,
            id: 10,
            serialNo: raw.spkNo,
            dateOfIssue: e.dateOfIssue,
            dateOfExpiry: e.dateOfExpiry,
          }),
        );

        registryRepo.create.mockImplementation(
          (e: Record<string, unknown>) => e,
        );

        return { driver, raw };
      }

      it('creates ECard linked to driver SPK, updates driver status to 2, adds to registry', async () => {
        setupECardMocks();

        const result = await service.createECard(USER_ID, 1, baseECardPayload);

        expect(result.id).toBe(10);
        expect(result.serialNo).toBe('UA-001-000001');

        // Verify driver status update to 2
        expect(driverRepo.update).toHaveBeenCalledWith(1, {
          idCard: 10,
          statusId: 2,
        });

        // Verify registry upsert
        expect(registryRepo.upsert).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ conflictPaths: ['driverId'] }),
        );
      });

      it('throws BadRequestException when driver has no SPK', async () => {
        mockTcId();

        const driverQb = createMockQueryBuilder();
        driverQb.getRawAndEntities.mockResolvedValue({
          entities: [
            {
              id: 1,
              surname: 'X',
              firstName: 'Y',
              middleName: 'Z',
              dateOfBirth: null,
              idEspk: null, // no SPK
              tcId: TC_ID,
            },
          ],
          raw: [
            {
              spkNo: null,
              eDateOfExpiry: null,
              eCarryTypeId: null,
              eCarryTypeTxt: null,
            },
          ],
        });
        driverRepo.createQueryBuilder.mockReturnValue(driverQb);

        await expect(
          service.createECard(USER_ID, 1, baseECardPayload),
        ).rejects.toThrow(BadRequestException);
      });

      it('throws NotFoundException when driver not found', async () => {
        mockTcId();

        const driverQb = createMockQueryBuilder();
        driverQb.getRawAndEntities.mockResolvedValue({
          entities: [],
          raw: [],
        });
        driverRepo.createQueryBuilder.mockReturnValue(driverQb);

        await expect(
          service.createECard(USER_ID, 999, baseECardPayload),
        ).rejects.toThrow(NotFoundException);
      });

      it('uses unionCode95 format: "95.DD.MM.YYYY"', async () => {
        setupECardMocks(
          { idEspk: 50 },
          { spkNo: 'SPK-001', eDateOfExpiry: '2030-12-31' },
          { dateOfTest: '2025-12-31' },
        );

        await service.createECard(USER_ID, 1, baseECardPayload);

        // unionCode95 should be 95.31.12.2030
        expect(cardRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            unionCode95: '95.31.12.2030',
          }),
        );
      });

      it('uses serial_no from SPK number', async () => {
        setupECardMocks(
          { idEspk: 50 },
          { spkNo: 'UA-CERT-000042', eDateOfExpiry: '2030-06-01' },
        );

        await service.createECard(USER_ID, 1, baseECardPayload);

        // serial_no should be the SPK number
        expect(cardRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            serialNo: 'UA-CERT-000042',
          }),
        );
      });

      it('throws ForbiddenException when user has no TC', async () => {
        mockNoTcId();

        await expect(
          service.createECard(USER_ID, 1, baseECardPayload),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getDriverEcardPrefill — data preparation for ECard form', () => {
      it('computes unionCode95 from SPK expiry date', async () => {
        mockTcId();

        const driverQb = createMockQueryBuilder();
        driverQb.getRawAndEntities.mockResolvedValue({
          entities: [
            {
              id: 1,
              surname: 'Test',
              firstName: 'Driver',
              dateOfBirth: '1990-01-01',
              tcId: TC_ID,
            },
          ],
          raw: [
            {
              spkNo: 'SPK-001',
              dateOfExpiry: '2030-03-15',
              tcNameShort: 'TC Short',
            },
          ],
        });
        driverRepo.createQueryBuilder.mockReturnValue(driverQb);

        const result = await service.getDriverEcardPrefill(USER_ID, 1);

        expect(result.unionCode95).toBe('95.15.03.2030');
        expect(result.issuedBy).toBe('TC Short');
        expect(result.spkSerialNo).toBe('SPK-001');
      });

      it('returns null unionCode95 when no SPK expiry', async () => {
        mockTcId();

        const driverQb = createMockQueryBuilder();
        driverQb.getRawAndEntities.mockResolvedValue({
          entities: [
            {
              id: 1,
              surname: 'Test',
              firstName: 'Driver',
              dateOfBirth: null,
              tcId: TC_ID,
            },
          ],
          raw: [
            {
              spkNo: null,
              dateOfExpiry: null,
              tcNameShort: 'TC',
            },
          ],
        });
        driverRepo.createQueryBuilder.mockReturnValue(driverQb);

        const result = await service.getDriverEcardPrefill(USER_ID, 1);
        expect(result.unionCode95).toBeNull();
      });
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
     Cross-cutting: TC ownership & authorization
     ═══════════════════════════════════════════════════════════════════════ */

  /* ═══════════════════════════════════════════════════════════════════════
     НФ-01–04: Course type — eligibility & splitting
     ═══════════════════════════════════════════════════════════════════════ */

  describe('validateCourseEligibility', () => {
    it('returns allEligible=true for INITIAL group when every driver has C/CE categories', async () => {
      mockTcId();
      sgRepo.findOne.mockResolvedValue({
        id: GROUP_ID,
        courseType: 'initial',
        carryTypeId: 1,
        trainingCenterId: TC_ID,
      });
      sgsRepo.find.mockResolvedValue([
        { studygroupId: GROUP_ID, edriverId: 10 },
      ]);
      driverRepo.findOne.mockResolvedValue({
        id: 10,
        surname: 'A',
        firstName: 'B',
        middleName: 'C',
        driverLicenseCategories: 'C,CE',
        driverLicenseIssueDate: '2010-01-01',
        driverLicenseExpiryDate: '2030-01-01',
        intendsUrbanSuburbanRoute: false,
      });
      const spkQb = createMockQueryBuilder();
      spkQb.getOne.mockResolvedValue(null);
      spkRepo.createQueryBuilder.mockReturnValue(spkQb);

      const result = await service.validateCourseEligibility(USER_ID, GROUP_ID);

      expect(result.allEligible).toBe(true);
      expect(result.blockedDriverIds).toHaveLength(0);
    });

    it('blocks drivers without matching license categories', async () => {
      mockTcId();
      sgRepo.findOne.mockResolvedValue({
        id: GROUP_ID,
        courseType: 'initial',
        carryTypeId: 1,
        trainingCenterId: TC_ID,
      });
      sgsRepo.find.mockResolvedValue([
        { studygroupId: GROUP_ID, edriverId: 10 },
        { studygroupId: GROUP_ID, edriverId: 11 },
      ]);
      driverRepo.findOne
        .mockResolvedValueOnce({
          id: 10,
          surname: 'Blocked',
          firstName: 'User',
          middleName: '',
          driverLicenseCategories: 'B', // not in heavy categories
          driverLicenseIssueDate: '2018-01-01',
          driverLicenseExpiryDate: '2030-01-01',
          intendsUrbanSuburbanRoute: false,
        })
        .mockResolvedValueOnce({
          id: 11,
          surname: 'Eligible',
          firstName: 'User',
          middleName: '',
          driverLicenseCategories: 'D,DE',
          driverLicenseIssueDate: '2010-01-01',
          driverLicenseExpiryDate: '2030-01-01',
          intendsUrbanSuburbanRoute: false,
        });
      const spkQb = createMockQueryBuilder();
      spkQb.getOne.mockResolvedValue(null);
      spkRepo.createQueryBuilder.mockReturnValue(spkQb);

      const result = await service.validateCourseEligibility(USER_ID, GROUP_ID);

      expect(result.allEligible).toBe(false);
      expect(result.blockedDriverIds).toEqual([10]);
      expect(result.issues).toHaveLength(1);
    });

    it('returns allEligible=true when course type is null (no validation needed)', async () => {
      mockTcId();
      sgRepo.findOne.mockResolvedValue({
        id: GROUP_ID,
        courseType: null,
        carryTypeId: 1,
        trainingCenterId: TC_ID,
      });

      const result = await service.validateCourseEligibility(USER_ID, GROUP_ID);
      expect(result.allEligible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('throws NotFoundException when group not found', async () => {
      mockTcId();
      sgRepo.findOne.mockResolvedValue(null);

      await expect(
        service.validateCourseEligibility(USER_ID, GROUP_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user has no TC', async () => {
      mockNoTcId();

      await expect(
        service.validateCourseEligibility(USER_ID, GROUP_ID),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('splitGroup', () => {
    it('removes blocked drivers from original group and creates new INITIAL group', async () => {
      mockTcId();
      sgRepo.findOne.mockResolvedValue({
        id: GROUP_ID,
        name: 'Group A',
        courseType: 'periodic',
        carryTypeId: 1,
        groupTypeId: null,
        dateStart: null,
        dateFinish: null,
        status: 1,
        trainingCenterId: TC_ID,
      });

      const newGroupId = 'new-initial-group-id';
      sgRepo.create.mockReturnValue({
        name: 'Group A (початковий курс)',
        courseType: 'initial',
      });
      sgRepo.save.mockResolvedValue({
        id: newGroupId,
        name: 'Group A (початковий курс)',
        courseType: 'initial',
      });

      const sgsQb = createMockQueryBuilder();
      sgsRepo.createQueryBuilder.mockReturnValue(sgsQb);

      const result = await service.splitGroup(USER_ID, GROUP_ID, [42]);

      expect(result.primaryGroupId).toBe(GROUP_ID);
      expect(result.secondaryGroupId).toBe(newGroupId);

      expect(sgsRepo.delete).toHaveBeenCalledWith({
        studygroupId: GROUP_ID,
        edriverId: 42,
      });

      expect(sgRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ courseType: 'initial' }),
      );
    });

    it('throws NotFoundException when group not found', async () => {
      mockTcId();
      sgRepo.findOne.mockResolvedValue(null);

      await expect(service.splitGroup(USER_ID, GROUP_ID, [1])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user has no TC', async () => {
      mockNoTcId();

      await expect(service.splitGroup(USER_ID, GROUP_ID, [1])).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('TC ownership checks', () => {
    it('getTcId returns null when user has no active employee record', async () => {
      mockNoTcId();

      const result = await service.getDashboard(USER_ID);
      expect(result).toBeNull();
    });

    it('getTcId finds TC via training_center_employee where is_active=true', async () => {
      mockTcId();
      tcRepo.findOne.mockResolvedValue(makeTcEntity());

      // Stats query builder
      const statsQb = createMockQueryBuilder();
      statsQb.getRawMany.mockResolvedValue([]);
      sgRepo.createQueryBuilder.mockReturnValue(statsQb);

      // Recent groups
      sgRepo.find.mockResolvedValue([]);

      const result = await service.getDashboard(USER_ID);
      expect(result).not.toBeNull();

      // Verify tceRepo.findOne was called with correct parameters
      expect(tceRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: USER_ID,
            isActive: true,
          }),
        }),
      );
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
     Audit logging
     ═══════════════════════════════════════════════════════════════════════ */

  describe('Audit logging', () => {
    it('logs GROUP_CREATE action when study group is created', async () => {
      mockTcId();
      sgRepo.create.mockReturnValue({
        name: 'G',
        trainingCenterId: TC_ID,
        status: 1,
      });
      sgRepo.save.mockResolvedValue({
        id: GROUP_ID,
        name: 'G',
        status: 1,
        carryTypeId: null,
        groupTypeId: null,
        dateStart: null,
        dateFinish: null,
        courseType: null,
      });

      await service.createStudyGroup(USER_ID, { name: 'G' });

      expect(auditService.log).toHaveBeenCalledWith(
        'group_create',
        'study_group',
        GROUP_ID,
        expect.objectContaining({ name: 'G' }),
        expect.objectContaining({ userId: USER_ID }),
      );
    });

    it('logs GROUP_STATUS_CHANGE action when group status changes', async () => {
      mockTcId();
      sgRepo.findOne.mockResolvedValue({
        id: GROUP_ID,
        trainingCenterId: TC_ID,
        status: 1,
        courseType: null,
      });
      sgRepo.update.mockResolvedValue(undefined);
      sgRepo.findOneOrFail.mockResolvedValue({
        id: GROUP_ID,
        status: 2,
        carryTypeId: null,
        groupTypeId: null,
        dateStart: null,
        dateFinish: null,
        courseType: null,
      });

      await service.changeStudyGroupStatus(USER_ID, GROUP_ID, 2);

      expect(auditService.log).toHaveBeenCalledWith(
        'group_status_change',
        'study_group',
        GROUP_ID,
        expect.objectContaining({ from: 1, to: 2 }),
        expect.objectContaining({ userId: USER_ID }),
      );
    });

    it('logs STUDENT_ADD action when student is added', async () => {
      mockTcId();
      tcRepo.findOne.mockResolvedValue({ id: TC_ID, oldId: 1 });
      sgRepo.findOne.mockResolvedValue({
        id: GROUP_ID,
        status: 1,
        trainingCenterId: TC_ID,
      });
      driverRepo.findOne.mockResolvedValue({
        id: 99,
        taxNumber: '1111',
        tcId: 1,
      });
      const insertQb = createMockQueryBuilder();
      insertQb.insert.mockReturnValue(insertQb);
      insertQb.into.mockReturnValue(insertQb);
      insertQb.values.mockReturnValue(insertQb);
      insertQb.orIgnore.mockReturnValue(insertQb);
      insertQb.execute.mockResolvedValue(undefined);
      sgsRepo.createQueryBuilder.mockReturnValue(insertQb);

      await service.addStudent(USER_ID, GROUP_ID, 99);

      expect(auditService.log).toHaveBeenCalledWith(
        'student_add',
        'study_group_student',
        GROUP_ID,
        expect.objectContaining({ driverId: 99 }),
        expect.objectContaining({ userId: USER_ID }),
      );
    });

    it('logs STUDENT_REMOVE action when student is removed', async () => {
      mockTcId();
      sgRepo.findOne.mockResolvedValue({
        id: GROUP_ID,
        status: 1,
        trainingCenterId: TC_ID,
      });
      sgsRepo.delete.mockResolvedValue(undefined);

      await service.removeStudent(USER_ID, GROUP_ID, 99);

      expect(auditService.log).toHaveBeenCalledWith(
        'student_remove',
        'study_group_student',
        GROUP_ID,
        expect.objectContaining({ driverId: 99 }),
        expect.objectContaining({ userId: USER_ID }),
      );
    });

    it('logs DRIVER_UPDATE action only when fields changed', async () => {
      mockTcId();
      tcRepo.findOne.mockResolvedValue({ id: TC_ID, oldId: 1 });
      driverRepo.findOne.mockResolvedValue({
        id: 10,
        taxNumber: '1234',
        tcId: 1,
        surname: 'A',
        firstName: 'B',
        middleName: 'C',
        dateOfBirth: null,
        phone: null,
        email: null,
        categoriesList: null,
        countryOfBirth: null,
      });
      cardRepo.findOne.mockResolvedValue(null);
      driverRepo.update.mockResolvedValue(undefined);
      driverRepo.findOneOrFail.mockResolvedValue({
        id: 10,
        surname: 'A',
        firstName: 'B',
        middleName: 'C',
        dateOfBirth: null,
        phone: '123',
        email: null,
        categoriesList: null,
        countryOfBirth: null,
        tcId: 1,
        idEspk: null,
        idCard: null,
        status: null,
      });

      await service.updateDriver(USER_ID, 10, { phone: '123' });

      expect(auditService.log).toHaveBeenCalledWith(
        'driver_update',
        'edriver',
        '10',
        expect.objectContaining({ phone: '123' }),
        expect.objectContaining({ userId: USER_ID }),
      );
    });

    it('does not log DRIVER_UPDATE when no fields changed', async () => {
      mockTcId();
      tcRepo.findOne.mockResolvedValue({ id: TC_ID, oldId: 1 });
      driverRepo.findOne.mockResolvedValue({ id: 10, tcId: 1 });
      cardRepo.findOne.mockResolvedValue(null);
      driverRepo.findOneOrFail.mockResolvedValue({
        id: 10,
        surname: 'A',
        firstName: 'B',
        middleName: 'C',
        dateOfBirth: null,
        phone: null,
        email: null,
        categoriesList: null,
        countryOfBirth: null,
        tcId: 1,
        idEspk: null,
        idCard: null,
      });

      await service.updateDriver(USER_ID, 10, {});

      expect(auditService.log).not.toHaveBeenCalledWith(
        'driver_update',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });

  /* ═══════════════════════════════════════════════════════════════════════
     getDriverHistory
     ═══════════════════════════════════════════════════════════════════════ */

  describe('getDriverHistory', () => {
    it('returns spkHistory for a driver belonging to TC', async () => {
      mockTcId();
      tcRepo.findOne.mockResolvedValue({ id: TC_ID, oldId: 1 });
      driverRepo.findOne.mockResolvedValue({ id: 42, tcId: 1 });
      spkRepo.find.mockResolvedValue([
        {
          id: 10,
          spkNo: 'UA-001-000001',
          tcName: 'TC',
          tcCertNo: 'UA-001',
          carryTypeTxt: 'D',
          courseType: 'initial',
          dateOfTest: '2024-01-15',
          dateOfExpiry: '2029-01-15',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
      ]);

      const result = await service.getDriverHistory(USER_ID, 42);

      expect(result.driverId).toBe(42);
      expect(result.spkHistory).toHaveLength(1);
      expect(result.spkHistory[0].spkNo).toBe('UA-001-000001');
      expect(result.spkHistory[0].courseType).toBe('initial');
    });

    it('throws ForbiddenException when user has no TC', async () => {
      mockNoTcId();
      tcRepo.findOne.mockResolvedValue(null);
      await expect(service.getDriverHistory(USER_ID, 42)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when driver not in TC', async () => {
      mockTcId();
      tcRepo.findOne.mockResolvedValue({ id: TC_ID, oldId: 1 });
      driverRepo.findOne.mockResolvedValue(null);
      await expect(service.getDriverHistory(USER_ID, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns empty spkHistory when driver has no SPKs', async () => {
      mockTcId();
      tcRepo.findOne.mockResolvedValue({ id: TC_ID, oldId: 1 });
      driverRepo.findOne.mockResolvedValue({ id: 42, tcId: 1 });
      spkRepo.find.mockResolvedValue([]);

      const result = await service.getDriverHistory(USER_ID, 42);
      expect(result.spkHistory).toHaveLength(0);
    });
  });

  // ── Flow 7: Cross-TC access (object-level security) ───────────────────────
  describe('Flow 7: Cross-TC access → 403 Forbidden', () => {
    /** Simulate user with no training center association → tceRepo returns null */
    function mockNoTc(): void {
      tceRepo.findOne.mockResolvedValue(null);
    }

    it('createStudyGroup throws ForbiddenException when user has no TC', async () => {
      mockNoTc();
      await expect(
        service.createStudyGroup(USER_ID, { name: 'G' }),
      ).rejects.toThrow('Forbidden');
    });

    it('changeStudyGroupStatus throws ForbiddenException when user has no TC', async () => {
      mockNoTc();
      await expect(
        service.changeStudyGroupStatus(USER_ID, GROUP_ID, 2),
      ).rejects.toThrow('Forbidden');
    });

    it('deleteStudyGroup throws ForbiddenException when user has no TC', async () => {
      mockNoTc();
      await expect(service.deleteStudyGroup(USER_ID, GROUP_ID)).rejects.toThrow(
        'Forbidden',
      );
    });

    it('getDriver throws ForbiddenException when user has no TC', async () => {
      mockNoTc();
      await expect(service.getDriver(USER_ID, 99)).rejects.toThrow('Forbidden');
    });

    it('getDriver throws NotFoundException when driver belongs to a different TC', async () => {
      // User is in TC_ID; driver's tcId belongs to old_id=999 (different TC)
      tceRepo.findOne.mockResolvedValue({ trainingCenterId: TC_ID });
      tcRepo.findOne.mockResolvedValue({ id: TC_ID, oldId: 1 });
      // driverRepo returns null because tcId filter doesn't match
      driverRepo.findOne.mockResolvedValue(null);

      await expect(service.getDriver(USER_ID, 99)).rejects.toThrow(
        'Driver not found',
      );
    });

    it('updateDriver throws ForbiddenException when user has no TC', async () => {
      mockNoTc();
      await expect(service.updateDriver(USER_ID, 99, {})).rejects.toThrow(
        'Forbidden',
      );
    });

    it('addStudent throws ForbiddenException when user has no TC', async () => {
      mockNoTc();
      await expect(service.addStudent(USER_ID, GROUP_ID, 1)).rejects.toThrow(
        'Forbidden',
      );
    });

    it('getDriverHistory throws ForbiddenException when user has no TC', async () => {
      // getTcOldId calls getTcId first; with no tce record, tcId is null
      tceRepo.findOne.mockResolvedValue(null);
      await expect(service.getDriverHistory(USER_ID, 42)).rejects.toThrow(
        'Forbidden',
      );
    });
  });

  /* ── SPK & ECard: Always display current driver profile data ──────── */
  describe('SPK & ECard: Current Driver Profile Data', () => {
    const DRIVER_ID = 42;
    const SPK_ID = 101;
    const ECARD_ID = 202;
    const COUNTRY_ID = 5;

    /**
     * Helper: Create a driver entity
     */
    function makeDriver(overrides: Partial<EDriver> = {}): EDriver {
      return {
        id: DRIVER_ID,
        surname: 'Іваненко',
        firstName: 'Іван',
        middleName: 'Іванович',
        taxNumber: '1234567890',
        dateOfBirth: '1985-05-15',
        phone: '+380671234567',
        email: 'ivan@example.com',
        statusId: 2,
        idEspk: SPK_ID,
        idCard: ECARD_ID,
        tcId: 1,
        countryOfBirthId: COUNTRY_ID,
        addrTown: null,
        addrStreet: null,
        addrHouse: null,
        addrFlat: null,
        postCode: null,
        photoImg: null,
        signImg: null,
        driverLicenseNo: null,
        driverLicenseCategories: null,
        driverLicenseIssueDate: null,
        driverLicenseExpiryDate: null,
        driverLicenseUpdatedAt: null,
        cCategoryIssueDate: null,
        dCategoryIssueDate: null,
        intendsUrbanSuburbanRoute: false,
        surnameTrans: null,
        firstNameTrans: null,
        categoriesList: null,
        lastUser: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      };
    }

    /**
     * Helper: Create an SPK entity
     */
    function makeSpk(overrides: Partial<ESPK> = {}): ESPK {
      return {
        id: SPK_ID,
        uuid: '00000000-0000-0000-0000-000000000000',
        tcId: 1,
        tcName: 'Training Center',
        tcCertNo: 'UA-001',
        spkNo: 'UA-001-000001',
        driverId: DRIVER_ID,
        driverPip: 'Іваненко І. І.',
        dateOfBirth: '1985-05-15',
        countryOfBirth: 'Україна',
        carryTypeId: 10,
        carryTypeTxt: 'C',
        dateOfMiniinfra: null,
        miniinfraNo: null,
        dateOfMinjust: null,
        minjustNo: null,
        dateOfTest: '2026-02-01',
        testProtocolNo: 'ПР-001',
        dateOfTestProtocol: '2026-02-01',
        dateOfExpiry: '2029-02-01',
        position: 'Директор',
        chiefPip: 'Chief',
        lastUser: null,
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
        courseType: 'initial' as any,
        ...overrides,
      };
    }

    /**
     * Helper: Create an ECard entity
     */
    function makeECard(overrides: Partial<ECard> = {}): ECard {
      return {
        id: ECARD_ID,
        driverId: DRIVER_ID,
        surname: 'Іваненко',
        firstName: 'Іван',
        surnameTrans: 'Ivanenko',
        firstNameTrans: 'Ivan',
        dateOfBirth: '1985-05-15',
        dateOfIssue: '2026-02-01',
        dateOfExpiry: '2029-02-01',
        issuedBy: 'Training Center',
        registrationNumber: 'REG-001',
        licenceNo: 'LIC-001',
        serialNo: 'UA-001-000001',
        categoriesList: 'C, C1E',
        unionCode95: '95.01.02.2029',
        createdAt: new Date('2026-02-01'),
        updatedAt: new Date('2026-02-01'),
        lastUser: null,
        photoImg: null,
        signImg: null,
        qrImg: null,
        ...overrides,
      };
    }

    /**
     * Helper: Create a country entity
     */
    function makeCountry(overrides: Partial<ECountry> = {}): ECountry {
      return {
        id: COUNTRY_ID,
        nameUkr: 'Україна',
        nameEng: 'Ukraine',
        ...overrides,
      };
    }

    beforeEach(() => {
      // Mock getTcId: user has access to TC
      tceRepo.findOne.mockResolvedValue({
        trainingCenterId: TC_ID,
      } as any);

      // Mock getTcOldId: training center with oldId
      tcRepo.findOne.mockResolvedValue(
        makeTcEntity({ id: TC_ID, oldId: 1 }) as any,
      );
    });

    describe('getSpk: Returns current driver profile data', () => {
      it('should return countryOfBirth from current driver profile, not hardcoded null', async () => {
        const driver = makeDriver({ countryOfBirthId: COUNTRY_ID });
        const spk = makeSpk();
        const country = makeCountry();

        // SPK query builder setup
        const spkQb = createMockQueryBuilder();
        spkQb.innerJoin.mockReturnValue(spkQb);
        spkQb.leftJoin.mockReturnValue(spkQb);
        spkQb.addSelect.mockReturnValue(spkQb);
        spkQb.where.mockReturnValue(spkQb);
        spkQb.andWhere.mockReturnValue(spkQb);
        spkQb.getRawAndEntities.mockResolvedValue({
          entities: [spk],
          raw: [
            {
              tcAddress: 'St, 1, код ЄДРПОУ 12345678',
              driverPipFull: 'Іваненко Іван Іванович',
              driverPiTrans: 'Ivanenko Ivan Ivanovich',
              carryTypeNameSpk: 'Категорія C',
            },
          ],
        });
        spkRepo.createQueryBuilder.mockReturnValue(spkQb);

        // Driver query
        driverRepo.findOne.mockResolvedValue(driver as any);

        // Country query
        countryRepo.findOne.mockResolvedValue(country as any);

        // ECard query for categoriesList
        cardRepo.findOne.mockResolvedValue(
          makeECard({ categoriesList: 'C, C1E' }) as any,
        );

        const result = await service.getSpk(USER_ID, SPK_ID);

        expect(result.countryOfBirth).toBe('Україна');
        expect(result.countryOfBirth).not.toBe(null);
      });

      it('should return current categoriesList from latest ECard', async () => {
        const driver = makeDriver();
        const spk = makeSpk();
        const latestCard = makeECard({
          categoriesList: 'C, C1E, C1',
          createdAt: new Date('2026-03-02'),
        });

        const spkQb = createMockQueryBuilder();
        spkQb.innerJoin.mockReturnValue(spkQb);
        spkQb.leftJoin.mockReturnValue(spkQb);
        spkQb.addSelect.mockReturnValue(spkQb);
        spkQb.where.mockReturnValue(spkQb);
        spkQb.andWhere.mockReturnValue(spkQb);
        spkQb.getRawAndEntities.mockResolvedValue({
          entities: [spk],
          raw: [
            {
              tcAddress: 'St, 1, код ЄДРПОУ 12345678',
              driverPipFull: 'Іваненко Іван Іванович',
              driverPiTrans: 'Ivanenko Ivan Ivanovich',
              carryTypeNameSpk: 'Категорія C',
            },
          ],
        });
        spkRepo.createQueryBuilder.mockReturnValue(spkQb);

        driverRepo.findOne.mockResolvedValue(driver as any);
        countryRepo.findOne.mockResolvedValue(makeCountry() as any);
        cardRepo.findOne.mockResolvedValue(latestCard as any);

        const result = await service.getSpk(USER_ID, SPK_ID);

        expect(result.categoriesList).toBe('C, C1E, C1');
      });

      it('should reflect updated categoriesList after driver profile edit', async () => {
        const driver = makeDriver();
        const spk = makeSpk();

        const newCard = makeECard({
          categoriesList: 'C, C1E, C1',
          createdAt: new Date('2026-03-03'),
        });

        const spkQb = createMockQueryBuilder();
        spkQb.innerJoin.mockReturnValue(spkQb);
        spkQb.leftJoin.mockReturnValue(spkQb);
        spkQb.addSelect.mockReturnValue(spkQb);
        spkQb.where.mockReturnValue(spkQb);
        spkQb.andWhere.mockReturnValue(spkQb);
        spkQb.getRawAndEntities.mockResolvedValue({
          entities: [spk],
          raw: [
            {
              tcAddress: 'St, 1, код ЄДРПОУ 12345678',
              driverPipFull: 'Іваненко Іван Іванович',
              driverPiTrans: 'Ivanenko Ivan Ivanovich',
              carryTypeNameSpk: 'Категорія C',
            },
          ],
        });
        spkRepo.createQueryBuilder.mockReturnValue(spkQb);

        driverRepo.findOne.mockResolvedValue(driver as any);
        countryRepo.findOne.mockResolvedValue(makeCountry() as any);
        cardRepo.findOne.mockResolvedValue(newCard as any);

        const result = await service.getSpk(USER_ID, SPK_ID);

        // Should return latest categoriesList, not the one stored in SPK
        expect(result.categoriesList).toBe('C, C1E, C1');
      });
    });

    describe('getECard: Returns current driver profile data', () => {
      it('should return countryOfBirth from current driver profile', async () => {
        const driver = makeDriver({ countryOfBirthId: COUNTRY_ID });
        const card = makeECard();
        const country = makeCountry();

        const cardQb = createMockQueryBuilder();
        cardQb.innerJoin.mockReturnValue(cardQb);
        cardQb.where.mockReturnValue(cardQb);
        cardQb.andWhere.mockReturnValue(cardQb);
        cardQb.getOne.mockResolvedValue(card);
        cardRepo.createQueryBuilder.mockReturnValue(cardQb);

        driverRepo.findOne.mockResolvedValue(driver as any);
        countryRepo.findOne.mockResolvedValue(country as any);

        const result = await service.getECard(USER_ID, ECARD_ID);

        expect(result.countryOfBirth).toBe('Україна');
        expect(result.countryOfBirth).not.toBe(null);
      });

      it('should return categoriesList from ECard', async () => {
        const driver = makeDriver();
        const card = makeECard({ categoriesList: 'D, DE' });

        const cardQb = createMockQueryBuilder();
        cardQb.innerJoin.mockReturnValue(cardQb);
        cardQb.where.mockReturnValue(cardQb);
        cardQb.andWhere.mockReturnValue(cardQb);
        cardQb.getOne.mockResolvedValue(card);
        cardRepo.createQueryBuilder.mockReturnValue(cardQb);

        driverRepo.findOne.mockResolvedValue(driver as any);
        countryRepo.findOne.mockResolvedValue(makeCountry() as any);

        const result = await service.getECard(USER_ID, ECARD_ID);

        expect(result.categoriesList).toBe('D, DE');
      });

      it('should return updated countryOfBirth after driver profile change', async () => {
        const newCountryId = 10;
        const driver = makeDriver({ countryOfBirthId: newCountryId });
        const card = makeECard();
        const newCountry = makeCountry({
          id: newCountryId,
          nameUkr: 'Франція',
        });

        const cardQb = createMockQueryBuilder();
        cardQb.innerJoin.mockReturnValue(cardQb);
        cardQb.where.mockReturnValue(cardQb);
        cardQb.andWhere.mockReturnValue(cardQb);
        cardQb.getOne.mockResolvedValue(card);
        cardRepo.createQueryBuilder.mockReturnValue(cardQb);

        driverRepo.findOne.mockResolvedValue(driver as any);
        countryRepo.findOne.mockResolvedValue(newCountry as any);

        const result = await service.getECard(USER_ID, ECARD_ID);

        // Should return the UPDATED country, not the one in the card at creation
        expect(result.countryOfBirth).toBe('Франція');
      });
    });
  });
});
