import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest, Public } from '../common/security';
import { RateLimitService } from '../redis/rate-limit.service';
import { AuthService } from './auth.service';
import { ApiZodBody } from '../common/openapi';

const loginSchema = z
  .object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) })
  .strict();
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
  })
  .strict();

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rate: RateLimitService,
  ) {}
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiZodBody(loginSchema)
  @ApiOperation({
    summary: 'Sign in using an email and password; sets HttpOnly access and refresh cookies.',
  })
  async login(
    @Body() input: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.rate.hit(`login-ip:${request.ip}`, 40);
    const body = loginSchema.parse(input);
    await this.rate.hit(`login-email:${body.email.toLowerCase()}`, 10);
    return this.auth.login(body.email, body.password, response);
  }
  @Get('me') me(@Req() request: AuthRequest) {
    return { user: request.user };
  }
  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    await this.rate.hit(`refresh:${request.ip}`, 120);
    return this.auth.refresh(request.cookies?.nexus_refresh, response);
  }
  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Req() request: AuthRequest, @Res({ passthrough: true }) response: Response) {
    return this.auth.logout(request.cookies?.nexus_refresh, response);
  }
  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @ApiZodBody(z.object({ email: z.string().email() }).strict())
  async forgot(@Body() input: unknown, @Req() request: AuthRequest) {
    await this.rate.hit(`forgot:${request.ip}`, 5);
    z.object({ email: z.string().trim().email().max(254) })
      .strict()
      .parse(input);
    // SMTP is intentionally not configured for the local demo. Never disclose account existence.
    return {
      message:
        'If this address belongs to an account, contact your workspace administrator for password recovery.',
    };
  }
  @Post('change-password')
  @HttpCode(200)
  @ApiZodBody(changePasswordSchema)
  async changePassword(
    @Body() input: unknown,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.rate.hit(`password:${request.user.id}`, 5);
    const body = changePasswordSchema.parse(input);
    const result = await this.auth.changePassword(
      request.user,
      body.currentPassword,
      body.newPassword,
    );
    this.auth.clearCookies(response);
    return result;
  }
}
