import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  membershipId: string | null;
  role: Role;
  schoolId: string | null;
  tokenType: 'access' | 'refresh';
}
