import { del, head, list, put } from '@vercel/blob';
import { Mapping, RunLog } from '@/types';

const MAPPINGS_PATH = 'repricer/mappings.json';
const LOGS_PREFIX = 'repricer/logs/';

async function readJsonBlob<T>(pathname: string, fallback: T): Promise<T> {
  try {
    const blob = await head(pathname);
    const response = await fetch(blob.url, { cache: 'no-store' });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getMappings(): Promise<Mapping[]> {
  return readJsonBlob<Mapping[]>(MAPPINGS_PATH, []);
}

export async function saveMappings(mappings: Mapping[]): Promise<void> {
  await put(MAPPINGS_PATH, JSON.stringify(mappings, null, 2), {
    access: 'public',
    allowOverwrite: true,
    contentType: 'application/json'
  });
}

export async function appendRunLog(log: RunLog): Promise<void> {
  const path = `${LOGS_PREFIX}${log.startedAt}_${log.id}.json`;

  await put(path, JSON.stringify(log, null, 2), {
    access: 'public',
    contentType: 'application/json'
  });
}

export async function getLatestLogs(limit = 20): Promise<RunLog[]> {
  try {
    const result = await list({
      prefix: LOGS_PREFIX,
      limit,
      mode: 'folded'
    });

    const blobs = [...result.blobs].sort((a, b) =>
      a.pathname < b.pathname ? 1 : -1
    );

    const logs = await Promise.all(
      blobs.slice(0, limit).map(async (blob) => {
        try {
          const response = await fetch(blob.url, { cache: 'no-store' });

          if (!response.ok) {
            return null;
          }

          return (await response.json()) as RunLog;
        } catch {
          return null;
        }
      })
    );

    return logs.filter((log): log is RunLog => log !== null);
  } catch {
    return [];
  }
}

export async function deleteMapping(id: string): Promise<void> {
  const mappings = await getMappings();
  const updated = mappings.filter((item) => item.id !== id);
  await saveMappings(updated);
}

export async function resetAllLogs(): Promise<void> {
  const result = await list({ prefix: LOGS_PREFIX, mode: 'folded' });

  if (result.blobs.length) {
    await del(result.blobs.map((blob) => blob.pathname));
  }
}
