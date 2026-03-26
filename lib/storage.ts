import { del, head, list, put } from '@vercel/blob';
import { Mapping, RunLog } from '@/types';

const MAPPINGS_PATH = 'repricer/mappings.json';
const LOGS_PREFIX = 'repricer/logs/';

async function readJsonBlob<T>(pathname: string, fallback: T): Promise<T> {
  try {
    console.log('readJsonBlob: head start ->', pathname);

    const blob = await head(pathname);

    console.log('readJsonBlob: head ok ->', {
      pathname: blob.pathname,
      url: blob.url
    });

    const response = await fetch(blob.url, { cache: 'no-store' });

    console.log('readJsonBlob: fetch status ->', response.status, pathname);

    if (!response.ok) {
      console.warn('readJsonBlob: fetch not ok, returning fallback ->', pathname);
      return fallback;
    }

    const json = (await response.json()) as T;

    console.log('readJsonBlob: json parsed ok ->', pathname);

    return json;
  } catch (error) {
    console.warn('readJsonBlob: fallback used ->', pathname, error);
    return fallback;
  }
}

export async function getMappings(): Promise<Mapping[]> {
  try {
    const mappings = await readJsonBlob<Mapping[]>(MAPPINGS_PATH, []);
    console.log('getMappings: loaded ->', mappings.length);
    return mappings;
  } catch (error) {
    console.error('getMappings error:', error);
    throw error;
  }
}

export async function saveMappings(mappings: Mapping[]): Promise<void> {
  try {
    console.log('saveMappings: start ->', {
      count: mappings.length,
      path: MAPPINGS_PATH
    });

    const result = await put(MAPPINGS_PATH, JSON.stringify(mappings, null, 2), {
      access: 'public',
      allowOverwrite: true,
      contentType: 'application/json'
    });

    console.log('saveMappings: put ok ->', {
      pathname: result.pathname,
      url: result.url
    });
  } catch (error) {
    console.error('saveMappings error:', error);
    throw error;
  }
}

export async function appendRunLog(log: RunLog): Promise<void> {
  const path = `${LOGS_PREFIX}${log.startedAt}_${log.id}.json`;

  try {
    console.log('appendRunLog: start ->', path);

    const result = await put(path, JSON.stringify(log, null, 2), {
      access: 'public',
      contentType: 'application/json'
    });

    console.log('appendRunLog: put ok ->', {
      pathname: result.pathname,
      url: result.url
    });
  } catch (error) {
    console.error('appendRunLog error:', error);
    throw error;
  }
}

export async function getLatestLogs(limit = 20): Promise<RunLog[]> {
  try {
    console.log('getLatestLogs: list start ->', {
      prefix: LOGS_PREFIX,
      limit
    });

    const result = await list({
      prefix: LOGS_PREFIX,
      limit,
      mode: 'folded'
    });

    console.log('getLatestLogs: list ok ->', result.blobs.length);

    const blobs = [...result.blobs].sort((a, b) =>
      a.pathname < b.pathname ? 1 : -1
    );

    const logs = await Promise.all(
      blobs.slice(0, limit).map(async (blob) => {
        try {
          console.log('getLatestLogs: fetch start ->', blob.pathname);

          const response = await fetch(blob.url, { cache: 'no-store' });

          console.log('getLatestLogs: fetch status ->', response.status, blob.pathname);

          if (!response.ok) {
            console.warn('getLatestLogs: skipping non-ok blob ->', blob.pathname);
            return null;
          }

          const json = (await response.json()) as RunLog;

          console.log('getLatestLogs: parsed ok ->', blob.pathname);

          return json;
        } catch (error) {
          console.warn('getLatestLogs: single blob failed ->', blob.pathname, error);
          return null;
        }
      })
    );

    const filtered = logs.filter((log): log is RunLog => log !== null);

    console.log('getLatestLogs: returning ->', filtered.length);

    return filtered;
  } catch (error) {
    console.error('getLatestLogs error:', error);
    return [];
  }
}

export async function deleteMapping(id: string): Promise<void> {
  try {
    console.log('deleteMapping: start ->', id);

    const mappings = await getMappings();
    const updated = mappings.filter((item) => item.id !== id);

    await saveMappings(updated);

    console.log('deleteMapping: done ->', id);
  } catch (error) {
    console.error('deleteMapping error:', error);
    throw error;
  }
}

export async function resetAllLogs(): Promise<void> {
  try {
    console.log('resetAllLogs: list start');

    const result = await list({ prefix: LOGS_PREFIX, mode: 'folded' });

    console.log('resetAllLogs: blobs found ->', result.blobs.length);

    if (result.blobs.length) {
      await del(result.blobs.map((blob) => blob.pathname));
      console.log('resetAllLogs: deleted all');
    }
  } catch (error) {
    console.error('resetAllLogs error:', error);
    throw error;
  }
}
