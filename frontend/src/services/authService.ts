import { api } from './api';
import type {
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
} from '../types/auth';

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/login', credentials);
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    return api.post<AuthResponse>('/auth/register', credentials);
  },
};
