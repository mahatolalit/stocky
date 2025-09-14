# Stocky API (Production)

A small Node.js + Express API backed by MongoDB/Mongoose. It records stock reward events, keeps per-user unit balances, and exposes simple portfolio and stats queries.

## Quick Start

```powershell
# In PowerShell
cd .\stocky
npm install
$env:MONGODB_URI="<your-mongodb-uri>"
$env:MONGODB_DB="stocky"
npm start
```

- Health check: `GET /health`

## Endpoints

- `POST /reward`: Idempotent create of a reward event; updates balances and journals fees.
- `GET /today-stocks/:userId`: Today’s events (IST business day).
- `GET /historical-inr/:userId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`: Daily portfolio value.
- `GET /stats/:userId`: Today’s totals and portfolio summary.
- `GET /portfolio/:userId`: Current positions with latest prices.

## Environment

- `MONGODB_URI` (required): Mongo connection string.
- `MONGODB_DB` (optional): Database name (`stocky` default).
- `PORT` (optional): HTTP port (`8080` default).

## What’s Inside

- `server.js`: Express app + DB boot.
- `src/config/db.js`: Mongoose connection helper.
- `src/routes/`: Route wiring.
- `src/controllers/`: Request handling and aggregation logic.
- `src/models/`: Mongoose schemas (events, accounts, journals, prices, etc.).

## Notes

- Uses Decimal128 in Mongo for money/quantities.
- Idempotency via `Idempotency-Key` header with short TTL.
- Keeps code lean; production-ready without extra scaffolding.
