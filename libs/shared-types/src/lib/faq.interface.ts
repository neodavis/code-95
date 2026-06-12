export interface FAQ {
  id: string;
  question: string;
  answer: string;
  isPublished: boolean;
}

export interface CreateFaqPayload {
  question: string;
  answer: string;
  isPublished?: boolean;
}

export interface UpdateFaqPayload {
  question?: string;
  answer?: string;
  isPublished?: boolean;
}
