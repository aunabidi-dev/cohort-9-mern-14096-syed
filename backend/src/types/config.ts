export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  db: DatabaseConfig;
  jwt: JwtConfig;
}
