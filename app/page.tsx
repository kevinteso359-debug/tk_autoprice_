import Dashboard from '@/app/components/dashboard';
import { getLatestLogs, getMappings } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [mappings, logs] = await Promise.all([getMappings(), getLatestLogs(10)]);
  return <Dashboard initialMappings={mappings} initialLogs={logs} />;
}
