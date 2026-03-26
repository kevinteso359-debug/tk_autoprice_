import {
  getAppToken,
  getInventoryOfferPrice,
  getOwnTradingPrice,
  getSourceListing,
  getUserToken,
  reviseTradingPrice,
  updateInventoryOfferPrice
} from '@/lib/ebay';
import { appendRunLog, getMappings } from '@/lib/storage';
import { applyDelta, clampPrice, roundPrice, makeId } from '@/lib/utils';
import { Mapping, RunLog, RunResult } from '@/types';

async function processMapping(mapping: Mapping, appToken: string, userToken: string): Promise<RunResult> {
  try {
    if (!mapping.enabled) {
      return {
        mappingId: mapping.id,
        mappingName: mapping.name,
        status: 'skipped',
        reason: 'Mapping disabled'
      };
    }

    const { sourcePrice } = await getSourceListing(mapping, appToken);
    const calculated = roundPrice(
      clampPrice(
        applyDelta(sourcePrice, mapping.deltaMode, mapping.deltaValue),
        mapping.minPrice,
        mapping.maxPrice
      ),
      mapping.roundTo
    );

    if (mapping.targetMode === 'trading') {
      if (!mapping.targetLegacyItemId) {
        throw new Error('Missing target legacy item id');
      }

      const targetPriceBefore = await getOwnTradingPrice(mapping.targetLegacyItemId, userToken);
      if (Number(targetPriceBefore.toFixed(2)) === Number(calculated.toFixed(2))) {
        return {
          mappingId: mapping.id,
          mappingName: mapping.name,
          sourcePrice,
          targetPriceBefore,
          targetPriceAfter: targetPriceBefore,
          status: 'skipped',
          reason: 'Price already aligned'
        };
      }

      await reviseTradingPrice(mapping.targetLegacyItemId, calculated, userToken);
      return {
        mappingId: mapping.id,
        mappingName: mapping.name,
        sourcePrice,
        targetPriceBefore,
        targetPriceAfter: calculated,
        status: 'updated',
        reason: 'Trading listing revised'
      };
    }

    if (!mapping.targetOfferId) {
      throw new Error('Missing target offer id');
    }

    const targetPriceBefore = await getInventoryOfferPrice(mapping.targetOfferId, userToken);
    if (Number(targetPriceBefore.toFixed(2)) === Number(calculated.toFixed(2))) {
      return {
        mappingId: mapping.id,
        mappingName: mapping.name,
        sourcePrice,
        targetPriceBefore,
        targetPriceAfter: targetPriceBefore,
        status: 'skipped',
        reason: 'Price already aligned'
      };
    }

    await updateInventoryOfferPrice(mapping.targetOfferId, calculated, userToken);
    return {
      mappingId: mapping.id,
      mappingName: mapping.name,
      sourcePrice,
      targetPriceBefore,
      targetPriceAfter: calculated,
      status: 'updated',
      reason: 'Inventory offer updated'
    };
  } catch (error) {
    return {
      mappingId: mapping.id,
      mappingName: mapping.name,
      status: 'error',
      reason: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function runRepricer(trigger: 'manual' | 'cron'): Promise<RunLog> {
  const mappings = await getMappings();
  const log: RunLog = {
    id: makeId('run'),
    startedAt: new Date().toISOString(),
    trigger,
    results: [],
    ok: true
  };

  if (!mappings.length) {
    log.results.push({
      mappingId: 'none',
      mappingName: 'No mappings',
      status: 'skipped',
      reason: 'No mappings configured'
    });
    log.finishedAt = new Date().toISOString();
    await appendRunLog(log);
    return log;
  }

  const appToken = await getAppToken();
  const userToken = await getUserToken();

  const results: RunResult[] = [];
  for (const mapping of mappings) {
    results.push(await processMapping(mapping, appToken, userToken));
  }

  log.results = results;
  log.ok = !results.some((result) => result.status === 'error');
  log.finishedAt = new Date().toISOString();

  await appendRunLog(log);
  return log;
}
