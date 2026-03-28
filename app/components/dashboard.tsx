'use client';

import { useEffect, useState } from 'react';
import { Mapping, RunLog } from '@/types';

const emptyForm = {
  name: '',
  enabled: true,
  marketplaceId: 'EBAY_IT',
  sourceLegacyItemId: '',
  sourceExpectedSeller: '',
  enforceSourceCountryIT: true,
  targetMode: 'trading',
  targetLegacyItemId: '',
  targetOfferId: '',
  targetSku: '',
  deltaMode: 'fixed',
  deltaValue: 0,
  minPrice: '',
  maxPrice: '',
  roundTo: '0.01'
};

export default function Dashboard({
  initialMappings,
  initialLogs
}: {
  initialMappings: Mapping[];
  initialLogs: RunLog[];
}) {
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
  const [logs, setLogs] = useState<RunLog[]>(initialLogs);
  const [form, setForm] = useState<any>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  // 👇 NUOVO STATE PER ACCORDION LOG
  const [openLogs, setOpenLogs] = useState<Record<string, boolean>>({});

  async function refreshAll() {
    const [mappingsRes, logsRes] = await Promise.all([
      fetch('/api/mappings'),
      fetch('/api/logs')
    ]);
    setMappings(await mappingsRes.json());
    setLogs(await logsRes.json());
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  function toggleLog(logId: string) {
    setOpenLogs((prev) => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  }

  async function saveMapping(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    const payload = {
      ...form,
      deltaValue: Number(form.deltaValue),
      minPrice: form.minPrice === '' ? undefined : Number(form.minPrice),
      maxPrice: form.maxPrice === '' ? undefined : Number(form.maxPrice),
      roundTo: form.roundTo === '' ? undefined : Number(form.roundTo)
    };

    const response = await fetch('/api/mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || 'Errore salvataggio');
      return;
    }

    setForm(emptyForm);
    setMessage('Mapping salvato');
    await refreshAll();
  }

  async function deleteMapping(id: string) {
    setBusy(true);
    await fetch(`/api/mappings?id=${id}`, { method: 'DELETE' });
    setBusy(false);
    await refreshAll();
  }

  async function runNow() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/run', { method: 'POST' });
    const data = await response.json();
    setBusy(false);
    setMessage(
      response.ok
        ? `Run completato: ${data.ok ? 'ok' : 'con errori'}`
        : 'Errore avvio run'
    );
    await refreshAll();
  }

  return (
    <div className="container grid">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>eBay IT Repricer</h1>
        <p className="muted">
          Collega una tua inserzione a una inserzione sorgente eBay Italia e aggiorna il prezzo ogni 2 ore con Vercel Cron.
        </p>
        <div className="actions">
          <button className="primary" onClick={runNow} disabled={busy}>
            Esegui sync adesso
          </button>
          <span className="badge">Refresh cron: ogni giorno</span>
          {message ? <span className="badge">{message}</span> : null}
        </div>
      </div>

      {/* FORM */}
      <form className="card grid" onSubmit={saveMapping}>
        <h2>Nuovo mapping</h2>

        <div className="row">
          <input
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Source Item ID"
            value={form.sourceLegacyItemId}
            onChange={(e) =>
              setForm({ ...form, sourceLegacyItemId: e.target.value })
            }
            required
          />
        </div>

        <div className="actions">
          <button className="primary" disabled={busy}>
            Salva mapping
          </button>
        </div>
      </form>

      {/* LOG */}
      <div className="card">
        <h2>Ultimi log</h2>

        <div className="grid">
          {logs.map((log) => {
            const isOpen = !!openLogs[log.id];

            return (
              <div key={log.id} className="card" style={{ padding: 14 }}>
                <button
                  onClick={() => toggleLog(log.id)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  <strong>
                    {log.trigger.toUpperCase()} • {log.ok ? 'OK' : 'ERRORI'}
                  </strong>
                  <div className="muted">{log.startedAt}</div>
                  <span className="badge">
                    {isOpen ? 'Nascondi ▲' : 'Apri ▼'}
                  </span>
                </button>

                {isOpen && (
                  <pre style={{ marginTop: 10 }}>
                    {JSON.stringify(log.results, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
