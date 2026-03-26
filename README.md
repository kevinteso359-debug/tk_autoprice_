# eBay IT Repricer

App Next.js pronta per GitHub + Vercel che:

- aggancia una tua inserzione a una inserzione sorgente su eBay Italia
- legge il prezzo della sorgente
- calcola il tuo nuovo prezzo con delta fisso o percentuale
- aggiorna automaticamente il prezzo ogni 2 ore con Vercel Cron
- salva mapping e log in Vercel Blob

## Stack

- Next.js
- Vercel Cron (`0 */2 * * *`)
- Vercel Blob per salvare configurazioni e log
- eBay Browse API per leggere la listing sorgente
- eBay Trading API o Inventory API per aggiornare la tua listing

## Limite importante

eBay ha due modelli diversi per modificare il prezzo:

1. **Trading API / ReviseFixedPriceItem** per molte inserzioni classiche.
2. **Inventory API** per inserzioni create col nuovo modello Inventory.

Se una tua inserzione è stata creata con il modello Inventory, devi usare `targetMode = inventory` e l'`offerId`.

## Variabili ambiente

Copia `.env.example` in `.env.local` e compila tutti i valori.

### eBay

Devi avere:

- una app eBay Developers
- `Client ID`
- `Client Secret`
- un `refresh token` utente con scope sell

## Avvio locale

```bash
npm install
npm run dev
```

## Deploy su GitHub + Vercel

1. Crea un nuovo repository GitHub.
2. Carica tutto il contenuto di questa cartella.
3. Importa il repository in Vercel.
4. Collega un Blob Store al progetto.
5. Inserisci tutte le environment variables del file `.env.example`.
6. Deploy.
7. Apri il sito, inserisci user e password Basic Auth, poi crea i mapping.

## Endpoint utili

- `GET /api/mappings`
- `POST /api/mappings`
- `DELETE /api/mappings?id=...`
- `POST /api/run` per lanciare un sync manuale
- `GET /api/cron` chiamato da Vercel ogni 2 ore
- `GET /api/logs`

## Sicurezza

- tutta la dashboard è protetta da Basic Auth via middleware
- il cron endpoint accetta solo `Authorization: Bearer CRON_SECRET`

## Nota pratica su Vercel Cron

Il progetto include già `vercel.json` con cron ogni 2 ore.
Se il tuo piano Vercel dovesse rifiutare cron più frequenti, passa a un piano compatibile.

## Possibili miglioramenti
init
- supporto edit mapping
- storico prezzi per grafici
- notifica Telegram quando il prezzo viene cambiato
- lookup automatico `offerId` partendo da SKU
- gestione multi-competitor con regola “segui il più basso”
