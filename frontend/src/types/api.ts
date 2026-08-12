export interface ApiErrorBody {
  message?: string;
}

export type RequestOptions = Omit<RequestInit, 'body'>;
