export type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  message?: string;
};
