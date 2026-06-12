export interface CarryType {
  id: number;
  name: string;
  nameSpk: string;
}

export interface CreateCarryTypePayload {
  name: string;
  nameSpk?: string;
}

export interface UpdateCarryTypePayload {
  name?: string;
  nameSpk?: string;
}
