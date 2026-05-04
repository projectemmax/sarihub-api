/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SiteConfigService {
    constructor(
        private prisma: PrismaService,
    ) {}

    // =========================
    // PUBLIC (TRANSFORMED)
    // =========================
    async getPublicConfig() {
        const configs = await this.prisma.siteConfig.findMany({
        where: { isPublic: true },
        });

        const result: Record<string, any> = {};

        for (const c of configs) {
        result[c.key] = c.value;
        }

        return result;
    }

    // =========================
    // ADMIN (RAW LIST)
    // =========================
    async getAllConfigs() {
        return this.prisma.siteConfig.findMany({
        orderBy: { key: 'asc' },
        });
    }

    // =========================
    // GET SINGLE
    // =========================
    async getConfig(key: string) {
        return this.prisma.siteConfig.findUnique({
        where: { key },
        });
    }

    // =========================
    // UPDATE SINGLE
    // =========================
    async updateConfig(key: string, value: any) {
        const validatedValue = this.validateConfigValue(key, value);

        return this.prisma.siteConfig.upsert({
            where: { key },
            update: { value: validatedValue },
            create: {
                key,
                value: validatedValue,
                isPublic: true,
            },
        });
    }

    // =========================
    // BULK UPDATE 🔥
    // =========================
    async updateBulk(configs: { key: string; value: any }[]) {

        const grouped: Record<string, any> = {};

        // 🔥 STEP 1: group dot keys
        configs.forEach(c => {
            const parts = c.key.split('.');

            if (parts.length === 1) {
            grouped[c.key] = c.value;
            } else {
            const parent = parts[0];
            const child = parts[1];

            if (!grouped[parent]) grouped[parent] = {};
            grouped[parent][child] = c.value;
            }
        });

        // 🔥 STEP 2: process grouped updates
        return Promise.all(
            Object.keys(grouped).map(async (key) => {

                const existing = await this.prisma.siteConfig.findUnique({
                    where: { key }
                });

                const validatedValue = this.validateConfigValue(key, grouped[key]);

                let finalValue = validatedValue;

                if (
                    typeof validatedValue === 'object' &&
                    !Array.isArray(validatedValue)
                ) {
                    const existingValue =
                    typeof existing?.value === 'object' && existing?.value !== null
                        ? existing.value
                        : {};

                    finalValue = {
                    ...existingValue,
                    ...validatedValue
                    };
                }

                return this.prisma.siteConfig.upsert({
                    where: { key },
                    update: { value: finalValue },
                    create: {
                    key,
                    value: finalValue,
                    isPublic: true,
                    },
                });
            })
        );
    }

    private validateConfigValue(key: string, value: any) {
        const numericKeys = [
            'shipping.baseFee',
            'shipping.freeThreshold',
            'shipping.sameProvinceFee',
            'shipping.otherProvinceFee',
        ];

        if (numericKeys.includes(key)) {
            const parsed = Number(value);

            if (Number.isNaN(parsed) || parsed < 0) {
            throw new BadRequestException(`${key} must be a valid positive number`);
            }

            return parsed;
        }

        if (key === 'shipping.enableFreeShipping') {
            if (typeof value !== 'boolean') {
            throw new BadRequestException(`${key} must be true or false`);
            }

            return value;
        }

        return value;
    }


}