export interface AppHttpError {
  status: number;
  name: string;
  message: string;
  details?: unknown;
}
