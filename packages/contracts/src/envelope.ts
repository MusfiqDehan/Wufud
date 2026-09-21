export type ApiEnvelope<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error_code?: string;
  errors?: Record<string, string[]> | string[];
};

export type Pagination = {
  has_next: boolean;
  has_previous: boolean;
  page_size: number;
  next_cursor?: string;
  previous_cursor?: string;
};

export type ListData<T> = {
  items: T[];
  pagination?: Pagination;
  meta?: Record<string, unknown>;
};

export type ListEnvelope<T> = ApiEnvelope<ListData<T>>;
