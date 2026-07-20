/* eslint-disable prettier/prettier */
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) {}

    // ✅ REGISTER
    async register(dto: RegisterDto) {
        const email = dto.email.trim().toLowerCase();

        const existingUser = await this.prisma.user.findUnique({
        where: { email },
        });

        if (existingUser) {
        throw new BadRequestException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            role: UserRole.CUSTOMER,

            customer: {
            create: {
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                mobileNo: dto.mobileNumber,
                gender: dto.gender ?? null,
            },
            },
        },
        include: {
            customer: true,
        },
        });

        return {
        success: true,
        message: 'Registration successful',
        data: {
            id: user.id,
            email: user.email,
            role: user.role,
            customer: {
            firstName: user.customer?.firstName,
            lastName: user.customer?.lastName,
            mobileNo: user.customer?.mobileNo,
            gender: user.customer?.gender,
            },
        },
        };
    }

    // ✅ LOGIN
    async login(email: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                customer: true,
            },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            sub: user.id,
            role: user.role,
            email: user.email,
            storeId: user.storeId ?? null,
        };

        console.log(
        'LOGIN PAYLOAD =>',
        payload
        );

        const accessToken = await this.jwtService.signAsync(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                storeId: user.storeId ?? null,
                firstName: user.customer?.firstName ?? null,
                lastName: user.customer?.lastName ?? null,
            },
        };
    }
}