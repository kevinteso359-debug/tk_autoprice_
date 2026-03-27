'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mapping, RunLog } from '@/types';

const emptyForm = {
  id: undefined as string | undefined,
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

type LogResult = {
  id: string;
  ok: boolean;
  error?: string;
  warning?: string | null;
  sourcePrice?: number;
  newPrice?: number;
  sourceTitle?: string;
  sourceQuantity?: number;
  sourceImageUrl?: string | null;
  targetTitle?: string | null;
  targetCurrentPrice?: number | null;
  targetImageUrl?: string | null;
  sourceOutOfStock?: boolean;
};

type LogWithResults = RunLog & {
  results?: LogResult[];
};

export default function Dashboard({
  initialMappings,
  initialLogs
}: {
  initialMappings: Mapping[];
  initialLogs: RunLog[];
}) {
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
  const [logs, setLogs] = useState<LogWithResults[]>(initialLogs as LogWithResults[]);
  const [form, setForm] = useState<any>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  async function refreshAll() {
    const [mappingsRes, logsRes] = await Promise.all([fetch('/api/mappings'), fetch('/api/logs')]);
    setMappings(await mappingsRes.json());
    setLogs(await logsRes.json());
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  const lastResultByMappingId = useMemo(() => {
    const map = new Map<string, LogResult>();

    for (const log of logs) {
      if (!Array.isArray(log.results)) continue;
      for (const result of log.results) {
        if (!map.has(result.id)) {
          map.set(result.id, result);
        }
      }
    }

    return map;
  }, [logs]);

  const filteredMappings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return mappings;

    return mappings.filter((mapping) => {
      const lastResult = lastResultByMappingId.get(mapping.id);

      const mappingName = mapping.name?.toLowerCase() || '';
      const targetTitle = lastResult?.targetTitle?.toLowerCase() || '';
      const sourceTitle = lastResult?.sourceTitle?.toLowerCase() || '';
      const targetId = mapping.targetLegacyItemId?.toLowerCase() || '';
      const sourceId = mapping.sourceLegacyItemId?.toLowerCase() || '';

      return (
        mappingName.includes(term) ||
        targetTitle.includes(term) ||
        sourceTitle.includes(term) ||
        targetId.includes(term) ||
        sourceId.includes(term)
      );
    });
  }, [mappings, lastResultByMappingId, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredMappings.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedMappings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMappings.slice(start, start + pageSize);
  }, [filteredMappings, currentPage, pageSize]);

  function startEdit(mapping: Mapping) {
    setForm({
      id: mapping.id,
      name: mapping.name ?? '',
      enabled: mapping.enabled ?? true,
      marketplaceId: mapping.marketplaceId ?? 'EBAY_IT',
      sourceLegacyItemId: mapping.sourceLegacyItemId ?? '',
      sourceExpectedSeller: mapping.sourceExpectedSeller ?? '',
      enforceSourceCountryIT: mapping.enforceSourceCountryIT ?? true,
      targetMode: mapping.targetMode ?? 'trading',
      targetLegacyItemId: mapping.targetLegacyItemId ?? '',
      targetOfferId: mapping.targetOfferId ?? '',
      targetSku: mapping.targetSku ?? '',
      deltaMode: mapping.deltaMode ?? 'fixed',
      deltaValue: mapping.deltaValue ?? 0,
      minPrice: mapping.minPrice ?? '',
      maxPrice: mapping.maxPrice ?? '',
      roundTo: mapping.roundTo ?? '0.01'
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setForm(emptyForm);
    setMessage('');
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

    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || data.detail || 'Errore salvataggio');
      return;
    }

    const wasEditing = !!form.id;
    setForm(emptyForm);
    setMessage(wasEditing ? 'Mapping aggiornato' : 'Mapping salvato');
    await refreshAll();
  }

  async function deleteMapping(id: string) {
    setBusy(true);
    setMessage('');
    await fetch(`/api/mappings?id=${id}`, { method: 'DELETE' });
    setBusy(false);

    if (form.id === id) {
      setForm(emptyForm);
    }

    await refreshAll();
  }

  async function runNow() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/run', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || data.detail || 'Errore avvio run');
      return;
    }

    const hadErrors = Array.isArray(data?.results) && data.results.some((r: LogResult) => !r.ok);
    const hadWarnings = Array.isArray(data?.results) && data.results.some((r: LogResult) => r.warning);

    if (hadErrors) {
      setMessage('Run completato con errori');
    } else if (hadWarnings) {
      setMessage('Run completato con avvisi');
    } else {
      setMessage('Run completato');
    }

    await refreshAll();
  }

  return (
    <div className="container grid">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>eBay IT Repricer</h1>
        <p className="muted">
          Collega una tua inserzione a una inserzione sorgente eBay Italia e aggiorna il prezzo automaticamente.
        </p>
        <div className="actions">
          <button className="primary" onClick={runNow} disabled={busy}>
            Esegui sync adesso
          </button>
          <span className="badge">Cron attuale: Hobby / giornaliero</span>
          {message ? <span className="badge">{message}</span> : null}
        </div>
      </div>

      <form className="card grid" onSubmit={saveMapping}>
        <div>
          <h2 style={{ marginTop: 0 }}>{form.id ? 'Modifica mapping' : 'Nuovo mapping'}</h2>
          <p className="muted">Per Trading usa il tuo Item ID. Per Inventory usa l&apos;Offer ID.</p>
        </div>

        <div className="row">
          <label>
            Nome
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Inserzione sorgente (legacy item id)
            <input
              value={form.sourceLegacyItemId}
              onChange={(e) => setForm({ ...form, sourceLegacyItemId: e.target.value })}
              required
            />
          </label>
          <label>
            Seller atteso
            <input
              value={form.sourceExpectedSeller}
              onChange={(e) => setForm({ ...form, sourceExpectedSeller: e.target.value })}
              placeholder="facoltativo"
            />
          </label>
        </div>

        <div className="row">
          <label>
            Modalità target
            <select value={form.targetMode} onChange={(e) => setForm({ ...form, targetMode: e.target.value })}>
              <option value="trading">Trading / listing classica</option>
              <option value="inventory">Inventory / offer</option>
            </select>
          </label>
          <label>
            Target Item ID
            <input
              value={form.targetLegacyItemId}
              onChange={(e) => setForm({ ...form, targetLegacyItemId: e.target.value })}
              placeholder="solo trading"
            />
          </label>
          <label>
            Target Offer ID
            <input
              value={form.targetOfferId}
              onChange={(e) => setForm({ ...form, targetOfferId: e.target.value })}
              placeholder="solo inventory"
            />
          </label>
        </div>

        <div className="row">
          <label>
            Delta mode
            <select value={form.deltaMode} onChange={(e) => setForm({ ...form, deltaMode: e.target.value })}>
              <option value="fixed">Prezzo fisso (+/- euro)</option>
              <option value="percent">Percentuale</option>
            </select>
          </label>
          <label>
            Delta value
            <input
              type="number"
              step="0.01"
              value={form.deltaValue}
              onChange={(e) => setForm({ ...form, deltaValue: e.target.value })}
            />
          </label>
          <label>
            Prezzo minimo
            <input
              type="number"
              step="0.01"
              value={form.minPrice}
              onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
            />
          </label>
          <label>
            Prezzo massimo
            <input
              type="number"
              step="0.01"
              value={form.maxPrice}
              onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
            />
          </label>
          <label>
            Arrotonda a
            <input
              type="number"
              step="0.01"
              value={form.roundTo}
              onChange={(e) => setForm({ ...form, roundTo: e.target.value })}
            />
          </label>
        </div>

        <div className="actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Attivo
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.enforceSourceCountryIT}
              onChange={(e) => setForm({ ...form, enforceSourceCountryIT: e.target.checked })}
            />
            Verifica paese sorgente = IT
          </label>

          <button className="primary" disabled={busy}>
            {form.id ? 'Aggiorna mapping' : 'Salva mapping'}
          </button>

          {form.id ? (
            <button type="button" onClick={cancelEdit} disabled={busy}>
              Annulla modifica
            </button>
          ) : null}
        </div>
      </form>

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 16
          }}
        >
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Mappings salvati</h2>
            <div className="muted">
              Totali: {filteredMappings.length} {searchTerm ? `(filtrati da ${mappings.length})` : ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Cerca per titolo inserzione o nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ minWidth: 280 }}
            />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="muted">Per pagina</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Tua inserzione</th>
              <th>Nome</th>
              <th>Sorgente</th>
              <th>Target</th>
              <th>Regola</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMappings.map((mapping) => {
              const lastResult = lastResultByMappingId.get(mapping.id);

              return (
                <tr key={mapping.id}>
                  <td style={{ width: 110 }}>
                    {lastResult?.targetImageUrl ? (
                      <img
                        src={lastResult.targetImageUrl}
                        alt={lastResult.targetTitle || mapping.name}
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: 'contain',
                          borderRadius: 8,
                          border: '1px solid #ddd',
                          background: '#fff'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          display: 'grid',
                          placeItems: 'center',
                          border: '1px solid #ddd',
                          borderRadius: 8,
                          fontSize: 12,
                          color: '#666',
                          textAlign: 'center',
                          padding: 4
                        }}
                      >
                        no img
                      </div>
                    )}
                  </td>

                  <td>
                    <strong>{mapping.name}</strong>
                    <br />
                    <span className="muted">{mapping.enabled ? 'attivo' : 'disattivo'}</span>
                    {lastResult?.targetTitle ? (
                      <>
                        <br />
                        <span className="muted">{lastResult.targetTitle}</span>
                      </>
                    ) : null}
                  </td>

                  <td>
                    ID: {mapping.sourceLegacyItemId}
                    <br />
                    Seller: {mapping.sourceExpectedSeller || 'non bloccato'}
                    {typeof lastResult?.sourcePrice === 'number' ? (
                      <>
                        <br />
                        Prezzo: {lastResult.sourcePrice.toFixed(2)} €
                      </>
                    ) : null}
                    {typeof lastResult?.sourceQuantity === 'number' ? (
                      <>
                        <br />
                        Qtà: {lastResult.sourceQuantity}
                      </>
                    ) : null}
                  </td>

                  <td>
                    {mapping.targetMode === 'trading'
                      ? `Trading ${mapping.targetLegacyItemId}`
                      : `Offer ${mapping.targetOfferId}`}
                    {typeof lastResult?.targetCurrentPrice === 'number' ? (
                      <>
                        <br />
                        Attuale: {lastResult.targetCurrentPrice.toFixed(2)} €
                      </>
                    ) : null}
                    {typeof lastResult?.newPrice === 'number' ? (
                      <>
                        <br />
                        Nuovo: {lastResult.newPrice.toFixed(2)} €
                      </>
                    ) : null}
                  </td>

                  <td>
                    {mapping.deltaMode === 'fixed' ? `${mapping.deltaValue} €` : `${mapping.deltaValue}%`}
                    <br />
                    min {mapping.minPrice ?? '-'} / max {mapping.maxPrice ?? '-'}
                  </td>

                  <td>
                    {lastResult?.sourceOutOfStock ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: 999,
                          background: '#ffe2e2',
                          color: '#b42318',
                          fontWeight: 700
                        }}
                      >
                        Concorrente esaurito
                      </span>
                    ) : lastResult?.warning ? (
                      <span className="badge">{lastResult.warning}</span>
                    ) : (
                      <span className="muted">Nessun alert</span>
                    )}
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => startEdit(mapping)} disabled={busy}>
                        Modifica
                      </button>
                      <button className="danger" onClick={() => deleteMapping(mapping.id)} disabled={busy}>
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!paginatedMappings.length ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nessun mapping trovato.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div
          style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <div className="muted">
            Pagina {currentPage} di {totalPages}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Precedente
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Successiva
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Ultimi log</h2>
        <div className="grid">
          {logs.map((log) => (
            <div key={log.id} className="card" style={{ padding: 14 }}>
              <strong>
                {log.trigger?.toUpperCase?.() || 'RUN'} • {log.ok ? 'OK' : 'ERRORI'}
              </strong>
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
