export interface User {
  id: string;
  uniqueCode: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  isStaff: boolean;
  isSuperuser: boolean;
  isActive: boolean;
  isEmployee: boolean;
}

export interface UserListItem {
  id: string;
  uniqueCode: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  phone: string;
  birthday: string | null;
  passport: string;
  identificationCode: string;
  region: string;
  isStaff: boolean;
  isSuperuser: boolean;
  isActive: boolean;
  dateJoined: string;
}

export interface CreateUserPayload {
  uniqueCode: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
  email?: string;
  birthday?: string | null;
  passport?: string;
  identificationCode?: string;
  region?: string;
  isStaff?: boolean;
  isSuperuser?: boolean;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  password?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
  phone?: string;
  birthday?: string | null;
  passport?: string;
  identificationCode?: string;
  region?: string;
  isStaff?: boolean;
  isSuperuser?: boolean;
  isActive?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginPayload {
  uniqueCode: string;
  password: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}
