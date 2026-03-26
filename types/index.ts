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

export type RunResult = {
  id: string;
  ok: boolean;
  error?: string;
  warning?: string | null;

  sourcePrice?: number;
  newPrice?: number;

  sourceTitle?: string;
  sourceQuantity?: number;
  sourceImageUrl?: string | null;

  targetTitle?: string | null;
  targetCurrentPrice?: number | null;
  targetImageUrl?: string | null;

  sourceOutOfStock?: boolean;
};

export type RunLog = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  trigger: 'manual' | 'cron';
  results: RunResult[];
  ok: boolean;
};

export type EbayItemInfo = {
  itemId: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
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
