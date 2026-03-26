export type UpdateMode = 'trading' | 'inventory';
export type DeltaMode = 'fixed' | 'percent';

export type Mapping = {
  id: string;
  name: string;
  enabled: boolean;
  marketplaceId: 'EBAY_IT';
  sourceLegacyItemId: string;
  sourceExpectedSeller?: string;
  enforceSourceCountryIT: boolean;
  targetMode: UpdateMode;
  targetLegacyItemId?: string;
  targetOfferId?: string;
  targetSku?: string;
  deltaMode: DeltaMode;
  deltaValue: number;
  minPrice?: number;
  maxPrice?: number;
  roundTo?: number;
  updatedAt: string;
  createdAt: string;
};

export type RunLog = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  trigger: 'manual' | 'cron';
  results: RunResult[];
  ok: boolean;
};

export type RunResult = {
  mappingId: string;
  mappingName: string;
  sourcePrice?: number;
  targetPriceBefore?: number;
  targetPriceAfter?: number;
  status: 'updated' | 'skipped' | 'error';
  reason: string;
};

export type EbayTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

export type EbayUserTokenResponse = EbayTokenResponse & {
  refresh_token?: string;
  refresh_token_expires_in?: number;
};
