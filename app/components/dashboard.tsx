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

export default function Dashboard({ initialMappings, initialLogs }: { initialMappings: Mapping[]; initialLogs: RunLog[] }) {
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
  const [logs, setLogs] = useState<RunLog[]>(initialLogs);
  const [form, setForm] = useState<any>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function refreshAll() {
    const [mappingsRes, logsRes] = await Promise.all([fetch('/api/mappings'), fetch('/api/logs')]);
    setMappings(await mappingsRes.json());
    setLogs(await logsRes.json());
  }

  useEffect(() => {
    void refreshAll();
  }, []);

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
    setMessage(response.ok ? `Run completato: ${data.ok ? 'ok' : 'con errori'}` : 'Errore avvio run');
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
          <button className="primary" onClick={runNow} disabled={busy}>Esegui sync adesso</button>
          <span className="badge">Refresh cron: ogni 2 ore</span>
          {message ? <span className="badge">{message}</span> : null}
        </div>
      </div>

      <form className="card grid" onSubmit={saveMapping}>
        <div>
          <h2 style={{ marginTop: 0 }}>Nuovo mapping</h2>
          <p className="muted">Per Trading usa il tuo Item ID. Per Inventory usa l&apos;Offer ID.</p>
        </div>

        <div className="row">
          <label>Nome
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>Inserzione sorgente (legacy item id)
            <input value={form.sourceLegacyItemId} onChange={(e) => setForm({ ...form, sourceLegacyItemId: e.target.value })} required />
          </label>
          <label>Seller atteso
            <input value={form.sourceExpectedSeller} onChange={(e) => setForm({ ...form, sourceExpectedSeller: e.target.value })} placeholder="facoltativo" />
          </label>
        </div>

        <div className="row">
          <label>Modalità target
            <select value={form.targetMode} onChange={(e) => setForm({ ...form, targetMode: e.target.value })}>
              <option value="trading">Trading / listing classica</option>
              <option value="inventory">Inventory / offer</option>
            </select>
          </label>
          <label>Target Item ID
            <input value={form.targetLegacyItemId} onChange={(e) => setForm({ ...form, targetLegacyItemId: e.target.value })} placeholder="solo trading" />
          </label>
          <label>Target Offer ID
            <input value={form.targetOfferId} onChange={(e) => setForm({ ...form, targetOfferId: e.target.value })} placeholder="solo inventory" />
          </label>
        </div>

        <div className="row">
          <label>Delta mode
            <select value={form.deltaMode} onChange={(e) => setForm({ ...form, deltaMode: e.target.value })}>
              <option value="fixed">Prezzo fisso (+/- euro)</option>
              <option value="percent">Percentuale</option>
            </select>
          </label>
          <label>Delta value
            <input type="number" step="0.01" value={form.deltaValue} onChange={(e) => setForm({ ...form, deltaValue: e.target.value })} />
          </label>
          <label>Prezzo minimo
            <input type="number" step="0.01" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} />
          </label>
          <label>Prezzo massimo
            <input type="number" step="0.01" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} />
          </label>
          <label>Arrotonda a
            <input type="number" step="0.01" value={form.roundTo} onChange={(e) => setForm({ ...form, roundTo: e.target.value })} />
          </label>
        </div>

        <div className="actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Attivo
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.enforceSourceCountryIT} onChange={(e) => setForm({ ...form, enforceSourceCountryIT: e.target.checked })} />
            Verifica paese sorgente = IT
          </label>
          <button className="primary" disabled={busy}>Salva mapping</button>
        </div>
      </form>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Mappings salvati</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Sorgente</th>
              <th>Target</th>
              <th>Regola</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => (
              <tr key={mapping.id}>
                <td>
                  <strong>{mapping.name}</strong><br />
                  <span className="muted">{mapping.enabled ? 'attivo' : 'disattivo'}</span>
                </td>
                <td>
                  ID: {mapping.sourceLegacyItemId}<br />
                  Seller: {mapping.sourceExpectedSeller || 'non bloccato'}
                </td>
                <td>
                  {mapping.targetMode === 'trading' ? `Trading ${mapping.targetLegacyItemId}` : `Offer ${mapping.targetOfferId}`}
                </td>
                <td>
                  {mapping.deltaMode === 'fixed' ? `${mapping.deltaValue} €` : `${mapping.deltaValue}%`}<br />
                  min {mapping.minPrice ?? '-'} / max {mapping.maxPrice ?? '-'}
                </td>
                <td>
                  <button className="danger" onClick={() => deleteMapping(mapping.id)} disabled={busy}>Elimina</button>
                </td>
              </tr>
            ))}
            {!mappings.length ? (
              <tr>
                <td colSpan={5} className="muted">Nessun mapping configurato.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Ultimi log</h2>
        <div className="grid">
          {logs.map((log) => (
            <div key={log.id} className="card" style={{ padding: 14 }}>
              <strong>{log.trigger.toUpperCase()} • {log.ok ? 'OK' : 'ERRORI'}</strong>
              <div className="muted">{log.startedAt}</div>
              <pre>{JSON.stringify(log.results, null, 2)}</pre>
            </div>
          ))}
          {!logs.length ? <div className="muted">Nessun log disponibile.</div> : null}
        </div>
      </div>
    </div>
  );
}
