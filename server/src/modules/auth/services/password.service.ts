import bcrypt from "bcrypt";

export const PASSWORD_HASH_ROUNDS = 12;

export interface PasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, passwordHash: string): Promise<boolean>;
}

export class BcryptPasswordService implements PasswordService {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
  }

  compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
