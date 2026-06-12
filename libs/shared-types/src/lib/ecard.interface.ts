export interface ECategoryTZ {
  id: number;
  name: string;
}

export interface ECard {
  id: number;
  driver: number;
  surname: string;
  firstName: string;
  surnameTranslit: string;
  firstNameTranslit: string;
  dateOfBirth: string;
  dateOfIssue: string;
  dateOfExpiry: string;
  issuedBy: string;
  registrationNumber: string;
  licenceNo: string;
  serialNo: string;
  photoImg: string | null;
  qrImg: string | null;
  signImg: string | null;
  categories: number[];
  categoriesList: string;
  unionCode95: string;
  createdAt: string;
  updatedAt: string;
  lastUser: number | null;
}
