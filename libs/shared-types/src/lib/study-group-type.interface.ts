export interface StudyGroupType {
  id: string;
  name: string;
}

export interface CreateStudyGroupTypePayload {
  name: string;
}

export interface UpdateStudyGroupTypePayload {
  name?: string;
}
