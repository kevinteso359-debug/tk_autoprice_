import { getItemPrice, updateItemPrice } from './ebay-trading';
import { getMappings } from './storage';

export async function runRepricer(mode: 'manual' | 'cron') {
  const mappings = await getMappings();

  const results = [];

  for (const m of mappings) {
    if (!m.enabled) continue;

    try {
      const sourcePrice = await getItemPrice(m.sourceLegacyItemId);

      let newPrice = sourcePrice;

      if (m.deltaMode === 'fixed') {
        newPrice = sourcePrice + m.deltaValue;
      } else {
        newPrice = sourcePrice * (1 + m.deltaValue / 100);
      }

      if (m.minPrice && newPrice < m.minPrice) newPrice = m.minPrice;
      if (m.maxPrice && newPrice > m.maxPrice) newPrice = m.maxPrice;

      if (m.roundTo) {
        newPrice = Math.round(newPrice / m.roundTo) * m.roundTo;
      }

      await updateItemPrice(m.targetLegacyItemId!, newPrice);

      results.push({
        id: m.id,
        ok: true,
        sourcePrice,
        newPrice
      });

    } catch (err: any) {
      results.push({
        id: m.id,
        ok: false,
        error: err.message
      });
    }
  }

  return {
    mode,
    results,
    timestamp: new Date().toISOString()
  };
}
