import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { SchoolMembership, SchoolMembershipStatus } from '../users/entities/school-membership.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ContextTokenPayload } from './interfaces/context-token-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    const memberships = await this.usersService.listMemberships(user.id);
    const formattedMemberships = this.formatMemberships(memberships);

    if (user.role === Role.SUPER_ADMIN) {
      const tokens = await this.issueTokens(this.buildPayload(user, null));
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          schoolId: null,
          membershipId: null,
          avatarUrl: user.avatarUrl
        },
        memberships: [],
        contextToken: null,
        activeMembershipId: null,
        requiresMembershipSelection: false
      };
    }

    const contextToken = await this.issueContextToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: null,
        schoolId: null,
        membershipId: null,
        avatarUrl: user.avatarUrl
      },
      memberships: formattedMemberships,
      contextToken,
      activeMembershipId: null,
      requiresMembershipSelection: true
    };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.createGlobalUser({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phoneNumber: dto.phoneNumber,
      email: dto.email,
      password: dto.password
    });

    const memberships = await this.usersService.listMemberships(user.id);
    const formattedMemberships = this.formatMemberships(memberships);

    if (user.role === Role.SUPER_ADMIN) {
      const tokens = await this.issueTokens(this.buildPayload(user, null));
      await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          schoolId: null,
          membershipId: null,
          avatarUrl: user.avatarUrl
        },
        memberships: [],
        contextToken: null,
        activeMembershipId: null,
        requiresMembershipSelection: false
      };
    }

    const contextToken = await this.issueContextToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: null,
        schoolId: null,
        membershipId: null,
        avatarUrl: user.avatarUrl
      },
      memberships: formattedMemberships,
      contextToken,
      activeMembershipId: null,
      requiresMembershipSelection: true
    };
  }

  async refreshToken(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersService.validateRefreshToken(payload.sub, refreshToken);
    const activeMembership =
      payload.membershipId != null ? await this.usersService.getMembershipByIdForUser(user.id, payload.membershipId) : null;
    const tokens = await this.issueTokens(this.buildPayload(user, activeMembership));

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async completeLoginContext(contextToken: string, membershipId: string) {
    const payload = await this.verifyContextToken(contextToken);
    const user = await this.usersService.findById(payload.sub);
    const membership = await this.usersService.getMembershipByIdForUser(user.id, membershipId);
    const tokens = await this.issueTokens(this.buildPayload(user, membership));
    const nextContextToken = await this.issueContextToken(user);

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      contextToken: nextContextToken,
      activeMembershipId: membership.id,
      activeMembership: this.formatMembership(membership)
    };
  }

  async switchContext(userId: string, membershipId: string) {
    const user = await this.usersService.findById(userId);
    const membership = await this.usersService.getMembershipByIdForUser(user.id, membershipId);
    const tokens = await this.issueTokens(this.buildPayload(user, membership));
    const contextToken = await this.issueContextToken(user);

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      contextToken,
      activeMembershipId: membership.id,
      activeMembership: this.formatMembership(membership)
    };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isValidPassword = await this.usersService.validatePassword(user, password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return user;
  }

  private async issueTokens(payload: JwtPayload) {
    const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') as SignOptions['expiresIn'];
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN'
    ) as SignOptions['expiresIn'];

    const accessToken = await this.jwtService.signAsync({ ...payload, tokenType: 'access' as const }, {
      secret: this.configService.get<string>('JWT_SECRET')!,
      expiresIn: accessExpiresIn
    });

    const refreshToken = await this.jwtService.signAsync({ ...payload, tokenType: 'refresh' as const }, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: refreshExpiresIn
    });

    return { accessToken, refreshToken };
  }

  private buildPayload(
    user: { id: string; email: string; role: import('../common/enums/role.enum').Role; schoolId: string | null },
    membership: SchoolMembership | null
  ): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      membershipId: membership?.id ?? null,
      role: membership?.role ?? user.role,
      schoolId: membership?.schoolId ?? user.schoolId,
      tokenType: 'access'
    };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET')!
      });

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Refresh token inválido');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  private async issueContextToken(user: { id: string; email: string }) {
    const contextExpiresIn = this.configService.get<string>('JWT_CONTEXT_EXPIRES_IN') as SignOptions['expiresIn'];
    const contextSecret =
      this.configService.get<string>('JWT_CONTEXT_SECRET') ?? this.configService.get<string>('JWT_SECRET')!;

    return this.jwtService.signAsync<ContextTokenPayload>(
      {
        sub: user.id,
        email: user.email,
        tokenType: 'context'
      },
      {
        secret: contextSecret,
        expiresIn: contextExpiresIn
      }
    );
  }

  private async verifyContextToken(token: string): Promise<ContextTokenPayload> {
    try {
      const contextSecret =
        this.configService.get<string>('JWT_CONTEXT_SECRET') ?? this.configService.get<string>('JWT_SECRET')!;
      const payload = await this.jwtService.verifyAsync<ContextTokenPayload>(token, {
        secret: contextSecret
      });

      if (payload.tokenType !== 'context') {
        throw new UnauthorizedException('Token de contexto inválido');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Token de contexto inválido');
    }
  }

  private formatMembership(membership: SchoolMembership) {
    return {
      id: membership.id,
      schoolId: membership.schoolId,
      role: membership.role,
      status: membership.status,
      schoolName: membership.school?.name ?? null,
      schoolSlug: membership.school?.slug ?? null
    };
  }

  private formatMemberships(memberships: SchoolMembership[] = []) {
    return memberships
      .filter((membership) => membership.status === SchoolMembershipStatus.ACTIVE)
      .map((membership) => this.formatMembership(membership));
  }
}
