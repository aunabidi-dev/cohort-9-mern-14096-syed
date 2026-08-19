import { api } from './api';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth';

export const authService = {
  login: (credentials: LoginCredentials): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/login', credentials);
  },

  register: (credentials: RegisterCredentials): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/register', credentials);
  },
};
