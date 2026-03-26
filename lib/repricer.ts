import { getItemInfo, updateItemPrice } from './ebay-trading';
import { appendRunLog, getMappings } from './storage';
import { RunLog, RunResult } from '@/types';

function roundPrice(value: number, step?: number) {
  if (!step || step <= 0) return value;
  return Math.round(value / step) * step;
}

function makeRunId() {
  return `run_${Math.random().toString(36).slice(2, 10)}`;
}

export async function runRepricer(trigger: 'manual' | 'cron'): Promise<RunLog> {
  const startedAt = new Date().toISOString();
  const mappings = await getMappings();
  const results: RunResult[] = [];

  for (const m of mappings) {
    if (!m.enabled) {
      results.push({
        id: m.id,
        ok: true,
        warning: 'Mapping disattivato',
        sourceOutOfStock: false
      });
      continue;
    }

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

      if (!sourceOutOfStock && m.targetLegacyItemId) {
        await updateItemPrice(m.targetLegacyItemId, newPrice);
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

      console.log('repricer result ->', {
        mappingId: m.id,
        sourceTitle: sourceInfo.title,
        sourcePrice,
        sourceQuantity: sourceInfo.quantity,
        sourceImageUrl: sourceInfo.imageUrl ?? null,
        targetTitle,
        targetCurrentPrice,
        targetImageUrl,
        newPrice,
        sourceOutOfStock
      });
    } catch (err: any) {
      console.error('repricer mapping error ->', {
        mappingId: m.id,
        error: err?.message || 'Errore sconosciuto'
      });

      results.push({
        id: m.id,
        ok: false,
        error: err?.message || 'Errore sconosciuto',
        sourceOutOfStock: false
      });
    }
  }

  const finishedAt = new Date().toISOString();
  const log: RunLog = {
    id: makeRunId(),
    startedAt,
    finishedAt,
    trigger,
    results,
    ok: results.every((r) => r.ok)
  };

  await appendRunLog(log);
  return log;
}
