import type { CourseType } from './training-center.interface';

export interface ECarryType {
  id: number;
  name: string;
  nameSpk: string;
}

export interface ESPK {
  id: number;
  tc: number;
  driver: number;
  tcName: string;
  tcCertNo: string;
  spkNo: string;
  dateOfTest: string;
  driverPip: string;
  dateOfBirth: string;
  countryOfBirth: string;
  carryType: number | null;
  carryTypeTxt: string;
  courseType: CourseType | null;
  dateOfMiniinfra: string;
  miniinfraNo: string;
  dateOfMinjust: string;
  minjustNo: string;
  testProtocolNo: string;
  dateOfTestProtocol: string;
  dateOfExpiry: string;
  position: string;
  chiefPip: string;
  createdAt: string;
  updatedAt: string;
  lastUser: number | null;
}
