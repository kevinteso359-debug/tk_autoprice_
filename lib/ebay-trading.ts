import fetch from 'node-fetch';

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

export async function getItemPrice(itemId: string) {
  const body = `<?xml version="1.0" encoding="utf-8"?>
  <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
      <eBayAuthToken>${process.env.EBAY_USER_TOKEN}</eBayAuthToken>
    </RequesterCredentials>
    <ItemID>${itemId}</ItemID>
    <DetailLevel>ReturnAll</DetailLevel>
  </GetItemRequest>`;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: getHeaders('GetItem'),
    body
  });

  const text = await res.text();

  const match = text.match(/<CurrentPrice[^>]*>(.*?)<\/CurrentPrice>/);
  if (!match) throw new Error('Prezzo non trovato');

  return parseFloat(match[1]);
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
    body
  });

  const text = await res.text();

  if (!text.includes('<Ack>Success</Ack>')) {
    throw new Error('Errore aggiornamento prezzo: ' + text);
  }

  return true;
}
