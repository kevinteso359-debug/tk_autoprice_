export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMappings, saveMappings } from '@/lib/storage';
import { makeId } from '@/lib/utils';
import { Mapping } from '@/types';

function parseLocaleNumber(value: unknown): number {
  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    return Number(normalized);
  }

  return Number(value);
}

const localeNumber = z.preprocess((value) => parseLocaleNumber(value), z.number());

const optionalLocaleNumber = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return parseLocaleNumber(value);
}, z.number().optional());

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  marketplaceId: z.literal('EBAY_IT').default('EBAY_IT'),
  sourceLegacyItemId: z.string().min(1),
  sourceExpectedSeller: z.string().optional().or(z.literal('')),
  enforceSourceCountryIT: z.boolean().default(true),
  targetMode: z.enum(['trading', 'inventory']),
  targetLegacyItemId: z.string().optional().or(z.literal('')),
  targetOfferId: z.string().optional().or(z.literal('')),
  targetSku: z.string().optional().or(z.literal('')),
  deltaMode: z.enum(['fixed', 'percent']),
  deltaValue: localeNumber,
  minPrice: optionalLocaleNumber,
  maxPrice: optionalLocaleNumber,
  roundTo: optionalLocaleNumber
});

function normalizeNumber(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return value;
}

export async function GET() {
  try {
    const mappings = await getMappings();
    return NextResponse.json(mappings);
  } catch (error) {
    console.error('GET /api/mappings error:', error);
    return NextResponse.json({ error: 'Failed to load mappings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    console.log('POST /api/mappings payload:', json);

    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      console.error('POST /api/mappings validation error:', parsed.error.flatten());
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const all = await getMappings();
    const now = new Date().toISOString();

    const mapping: Mapping = {
      id: body.id || makeId('map'),
      name: body.name,
      enabled: body.enabled,
      marketplaceId: 'EBAY_IT',
      sourceLegacyItemId: body.sourceLegacyItemId,
      sourceExpectedSeller: body.sourceExpectedSeller || undefined,
      enforceSourceCountryIT: body.enforceSourceCountryIT,
      targetMode: body.targetMode,
      targetLegacyItemId: body.targetLegacyItemId || undefined,
      targetOfferId: body.targetOfferId || undefined,
      targetSku: body.targetSku || undefined,
      deltaMode: body.deltaMode,
      deltaValue: body.deltaValue,
      minPrice: normalizeNumber(body.minPrice),
      maxPrice: normalizeNumber(body.maxPrice),
      roundTo: normalizeNumber(body.roundTo),
      createdAt: now,
      updatedAt: now
    };

    if (mapping.targetMode === 'trading' && !mapping.targetLegacyItemId) {
      return NextResponse.json(
        { error: 'targetLegacyItemId is required for trading mode' },
        { status: 400 }
      );
    }

    if (mapping.targetMode === 'inventory' && !mapping.targetOfferId) {
      return NextResponse.json(
        { error: 'targetOfferId is required for inventory mode' },
        { status: 400 }
      );
    }

    const existingIndex = all.findIndex((item) => item.id === mapping.id);

    if (existingIndex >= 0) {
      mapping.createdAt = all[existingIndex].createdAt;
      all[existingIndex] = mapping;
    } else {
      all.unshift(mapping);
    }

    console.log('POST /api/mappings saving mapping:', mapping);
    await saveMappings(all);
    console.log('POST /api/mappings saved successfully');

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('POST /api/mappings unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const all = await getMappings();
    await saveMappings(all.filter((item) => item.id !== id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/mappings error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
