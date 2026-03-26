import { env } from '@/lib/env';
import { EbayTokenResponse, EbayUserTokenResponse, Mapping } from '@/types';

const REST_BASE = 'https://api.ebay.com';
const OAUTH_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const TRADING_URL = 'https://api.ebay.com/ws/api.dll';

function basicAuth() {
  return Buffer.from(`${env.ebayClientId}:${env.ebayClientSecret}`).toString('base64');
}

export async function getAppToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope'
  });

  const response = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body,
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Unable to get eBay app token: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as EbayTokenResponse;
  return data.access_token;
}

export async function getUserToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: env.ebayUserRefreshToken,
    scope: [
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
      'https://api.ebay.com/oauth/api_scope'
    ].join(' ')
  });

  const response = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body,
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Unable to refresh eBay user token: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as EbayUserTokenResponse;
  return data.access_token;
}

export async function getSourceListing(mapping: Mapping, appToken: string) {
  const url = new URL(`${REST_BASE}/buy/browse/v1/item/get_item_by_legacy_id`);
  url.searchParams.set('legacy_item_id', mapping.sourceLegacyItemId);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${appToken}`,
      'X-EBAY-C-MARKETPLACE-ID': mapping.marketplaceId
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Source item lookup failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const sourcePrice = Number(data?.price?.value);
  const sellerUsername = data?.seller?.username as string | undefined;
  const itemCountry = data?.itemLocation?.country as string | undefined;

  if (!Number.isFinite(sourcePrice)) {
    throw new Error('Source item price not found');
  }

  if (mapping.sourceExpectedSeller && sellerUsername?.toLowerCase() !== mapping.sourceExpectedSeller.toLowerCase()) {
    throw new Error(`Source seller mismatch. Expected ${mapping.sourceExpectedSeller}, got ${sellerUsername || 'unknown'}`);
  }

  if (mapping.enforceSourceCountryIT && itemCountry !== 'IT') {
    throw new Error(`Source item country is not IT. Got ${itemCountry || 'unknown'}`);
  }

  return {
    sourcePrice,
    sellerUsername,
    itemCountry
  };
}

export async function getOwnTradingPrice(itemId: string, userToken: string): Promise<number> {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${userToken}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
</GetItemRequest>`;

  const response = await fetch(TRADING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-SITEID': env.ebaySiteId,
      'X-EBAY-API-COMPATIBILITY-LEVEL': env.tradingCompatLevel,
      'X-EBAY-API-CALL-NAME': 'GetItem'
    },
    body: xml,
    cache: 'no-store'
  });

  const text = await response.text();
  const match = text.match(/<CurrentPrice[^>]*>([^<]+)<\/CurrentPrice>/i);
  if (!match) {
    throw new Error(`Unable to read current Trading price for item ${itemId}`);
  }
  return Number(match[1]);
}

export async function reviseTradingPrice(itemId: string, price: number, userToken: string): Promise<void> {
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<ReviseFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${userToken}</eBayAuthToken>
  </RequesterCredentials>
  <Item>
    <ItemID>${itemId}</ItemID>
    <StartPrice>${price.toFixed(2)}</StartPrice>
  </Item>
</ReviseFixedPriceItemRequest>`;

  const response = await fetch(TRADING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-SITEID': env.ebaySiteId,
      'X-EBAY-API-COMPATIBILITY-LEVEL': env.tradingCompatLevel,
      'X-EBAY-API-CALL-NAME': 'ReviseFixedPriceItem'
    },
    body: xml,
    cache: 'no-store'
  });

  const text = await response.text();
  if (!response.ok || /<Ack>Failure<\/Ack>/i.test(text)) {
    throw new Error(`Trading revise failed for item ${itemId}: ${text}`);
  }
}

export async function getInventoryOfferPrice(offerId: string, userToken: string): Promise<number> {
  const response = await fetch(`${REST_BASE}/sell/inventory/v1/offer/${offerId}`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Unable to read offer ${offerId}: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const price = Number(data?.pricingSummary?.price?.value);
  if (!Number.isFinite(price)) {
    throw new Error(`Price not found in offer ${offerId}`);
  }
  return price;
}

export async function updateInventoryOfferPrice(offerId: string, price: number, userToken: string): Promise<void> {
  const response = await fetch(`${REST_BASE}/sell/inventory/v1/inventory_item/bulk_update_price_quantity`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          offers: [
            {
              offerId,
              price: {
                currency: 'EUR',
                value: price.toFixed(2)
              }
            }
          ]
        }
      ]
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Inventory update failed for offer ${offerId}: ${response.status} ${await response.text()}`);
  }
}
