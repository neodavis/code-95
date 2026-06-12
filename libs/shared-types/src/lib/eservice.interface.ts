export interface EServiceType {
  id: number;
  title: string;
  category: string;
  controller: string;
  model: string;
}

export type EServiceStatusSlug =
  | 'new'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'deleted';

export interface EServiceMeta {
  id: number;
  categoryIndex: string;
  name: string;
  slug: EServiceStatusSlug;
}

export interface EServiceFile {
  id: number;
  name: string;
  url: string;
  createdAt: string;
}

export interface EService {
  id: number;
  internalId: string;
  createdBy: number;
  type: number;
  resolutioner: number | null;
  status: number | null;
  title: string;
  createdAt: string;
  createdByIp: string;
  deadline: string | null;
  closeAt: string | null;
  version: number;
  periodExtended: string | null;
  editComment: string;
  isDeleted: string;
  files?: EServiceFile[];
}
