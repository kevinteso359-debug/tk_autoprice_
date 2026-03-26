import { getItemInfo, updateItemPrice } from './ebay-trading';
import { getMappings } from './storage';

function roundPrice(value: number, step?: number) {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

export async function runRepricer(mode: 'manual' | 'cron') {
  const mappings = await getMappings();

  const results = [];

  for (const m of mappings) {
    if (!m.enabled) continue;

    try {
      const sourceInfo = await getItemInfo(m.sourceLegacyItemId);
      const targetInfo = m.targetLegacyItemId
        ? await getItemInfo(m.targetLegacyItemId)
        : null;

      const sourcePrice = sourceInfo.price;
      let newPrice = sourcePrice;

      if (m.deltaMode === 'fixed') {
        newPrice = sourcePrice + m.deltaValue;
      } else {
        newPrice = sourcePrice * (1 + m.deltaValue / 100);
      }

      if (typeof m.minPrice === 'number' && newPrice < m.minPrice) {
        newPrice = m.minPrice;
      }

      if (typeof m.maxPrice === 'number' && newPrice > m.maxPrice) {
        newPrice = m.maxPrice;
      }

      newPrice = roundPrice(newPrice, m.roundTo);

      const sourceOutOfStock = sourceInfo.quantity <= 0;
      const targetCurrentPrice = targetInfo?.price ?? null;
      const targetImageUrl = targetInfo?.imageUrl ?? null;
      const targetTitle = targetInfo?.title ?? null;

      if (!sourceOutOfStock) {
        await updateItemPrice(m.targetLegacyItemId!, newPrice);
      }

      results.push({
        id: m.id,
        ok: true,
        sourcePrice,
        newPrice,
        sourceTitle: sourceInfo.title,
        sourceQuantity: sourceInfo.quantity,
        sourceImageUrl: sourceInfo.imageUrl ?? null,
        targetTitle,
        targetCurrentPrice,
        targetImageUrl,
        sourceOutOfStock,
        warning: sourceOutOfStock
          ? 'ATTENZIONE: inserzione concorrente a quantità 0'
          : null
      });
    } catch (err: any) {
      results.push({
        id: m.id,
        ok: false,
        error: err?.message || 'Errore sconosciuto'
      });
    }
  }

  return {
    mode,
    results,
    timestamp: new Date().toISOString()
  };
}
