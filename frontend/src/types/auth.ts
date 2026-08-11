export interface User {
  id: number;
  email: string;
}

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
}
