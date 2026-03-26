const ENDPOINT = 'https://api.ebay.com/ws/api.dll';

function getHeaders(callName: string) {
  return {
    'X-EBAY-API-COMPATIBILITY-LEVEL': '1207',
    'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID!,
    'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID!,
    'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID!,
    'X-EBAY-API-CALL-NAME': callName,
    'X-EBAY-API-SITEID': process.env.EBAY_SITE_ID || '101',
    'Content-Type': 'text/xml'
  };
}

export type EbayItemInfo = {
  itemId: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

function decodeXml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function extractTag(xml: string, tag: string): string | undefined {
  const cdataRegex = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, 's');
  const normalRegex = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 's');

  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch?.[1]) return cdataMatch[1].trim();

  const normalMatch = xml.match(normalRegex);
  if (normalMatch?.[1]) return decodeXml(normalMatch[1].trim());

  return undefined;
}

function extractPrice(xml: string): number {
  const match = xml.match(/<CurrentPrice[^>]*>(.*?)<\/CurrentPrice>/);
  if (!match?.[1]) {
    throw new Error('Prezzo non trovato nella risposta eBay: ' + xml);
  }
  return parseFloat(match[1]);
}

function extractQuantity(xml: string): number {
  const soldMatch = xml.match(/<QuantityAvailable>(.*?)<\/QuantityAvailable>/);
  if (soldMatch?.[1]) {
    const parsed = parseInt(soldMatch[1], 10);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const qtyMatch = xml.match(/<Quantity>(.*?)<\/Quantity>/);
  if (qtyMatch?.[1]) {
    const parsed = parseInt(qtyMatch[1], 10);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 0;
}

function extractImageUrl(xml: string): string | undefined {
  const gallery = extractTag(xml, 'GalleryURL');
  if (gallery) return gallery;

  const galleryPlus = extractTag(xml, 'GalleryPlusPictureURL');
  if (galleryPlus) return galleryPlus;

  const pictureMatches = [...xml.matchAll(/<PictureURL>(.*?)<\/PictureURL>/g)];
  if (pictureMatches.length > 0 && pictureMatches[0][1]) {
    return decodeXml(pictureMatches[0][1].trim());
  }

  return undefined;
}

export async function getItemInfo(itemId: string): Promise<EbayItemInfo> {
  const body = `<?xml version="1.0" encoding="utf-8"?>
  <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
      <eBayAuthToken>${process.env.EBAY_USER_TOKEN}</eBayAuthToken>
    </RequesterCredentials>
    <ItemID>${itemId}</ItemID>
    <DetailLevel>ReturnAll</DetailLevel>
    <IncludeItemSpecifics>false</IncludeItemSpecifics>
  </GetItemRequest>`;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: getHeaders('GetItem'),
    body,
    cache: 'no-store'
  });

  const text = await res.text();

  if (!text.includes('<Ack>Success</Ack>') && !text.includes('<Ack>Warning</Ack>')) {
    throw new Error('Errore GetItem: ' + text);
  }

  const title = extractTag(text, 'Title') || `Item ${itemId}`;
  const price = extractPrice(text);
  const quantity = extractQuantity(text);
  const imageUrl = extractImageUrl(text);
  
console.log('getItemInfo result ->', {
  itemId,
  title,
  price,
  quantity,
  imageUrl
});
  
  return {
    itemId,
    title,
    price,
    quantity,
    imageUrl
  };
}

export async function getItemPrice(itemId: string): Promise<number> {
  const info = await getItemInfo(itemId);
  return info.price;
}

export async function updateItemPrice(itemId: string, price: number) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
  <ReviseFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
      <eBayAuthToken>${process.env.EBAY_USER_TOKEN}</eBayAuthToken>
    </RequesterCredentials>
    <Item>
      <ItemID>${itemId}</ItemID>
      <StartPrice>${price}</StartPrice>
    </Item>
  </ReviseFixedPriceItemRequest>`;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: getHeaders('ReviseFixedPriceItem'),
    body,
    cache: 'no-store'
  });

  const text = await res.text();

  if (!text.includes('<Ack>Success</Ack>') && !text.includes('<Ack>Warning</Ack>')) {
    throw new Error('Errore aggiornamento prezzo: ' + text);
  }

  return true;
}
