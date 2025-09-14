const mongoose = require('mongoose');
const IdempotencyKey = require('../models/IdempotencyKey');
const RewardEvent = require('../models/RewardEvent');
const LedgerJournal = require('../models/LedgerJournal');
const UnitAccount = require('../models/UnitAccount');
const StockSymbol = require('../models/StockSymbol');

function validSymbol(s) {
  return typeof s === 'string' && /^[A-Z.]{1,10}$/.test(s);
}

exports.postReward = async (req, res) => {
  const key = req.get('Idempotency-Key');
  const { userId, symbol, quantity, rewardedAt, note, fees } = req.body || {};
  if (!key) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Idempotency-Key header required' } });
  if (!userId || !validSymbol(symbol) || !quantity || !rewardedAt) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing/invalid fields' } });
  }

  const payloadHash = JSON.stringify({ userId, symbol, quantity, rewardedAt, note, fees });
  const session = await mongoose.startSession();
  let status = 201;
  let body;

  const exec = async (s) => {
    const sym = s ? await StockSymbol.findById(symbol).session(s) : await StockSymbol.findById(symbol);
    if (!sym) throw new Error('VALIDATION:SYMBOL');

    const existing = s ? await IdempotencyKey.findById(key).session(s) : await IdempotencyKey.findById(key);
    if (existing) {
      if (existing.requestHash !== payloadHash) { status = 409; throw new Error('CONFLICT:KEY'); }
      status = 200; body = existing.response; return;
    }

    const [event] = s
      ? await RewardEvent.create([{ userId, symbol, quantity, rewardedAt: new Date(rewardedAt), note }], { session: s })
      : await RewardEvent.create([{ userId, symbol, quantity, rewardedAt: new Date(rewardedAt), note }]);

    const moneyEntries = [];
    if (fees) {
      if (fees.brokerageInr) moneyEntries.push({ account: 'Expense:Brokerage', amountInr: fees.brokerageInr });
      if (fees.sttInr)       moneyEntries.push({ account: 'Expense:STT',       amountInr: fees.sttInr });
      if (fees.gstInr)       moneyEntries.push({ account: 'Expense:GST',       amountInr: fees.gstInr });
      if (fees.otherInr)     moneyEntries.push({ account: 'Expense:Other',     amountInr: fees.otherInr });
    }

    const [journal] = s
      ? await LedgerJournal.create([{ eventId: event._id, memo: note || null, moneyEntries, unitEntries: [{ userId, symbol, quantity }] }], { session: s })
      : await LedgerJournal.create([{ eventId: event._id, memo: note || null, moneyEntries, unitEntries: [{ userId, symbol, quantity }] }]);

    const inc = typeof quantity === 'object' ? quantity : mongoose.Types.Decimal128.fromString(String(quantity));
    const up = [{ userId, symbol }, { $inc: { balance: inc }, $setOnInsert: { userId, symbol }, $set: { updatedAt: new Date() } }, { upsert: true }];
    if (s) up[2].session = s;
    await UnitAccount.updateOne(...up);

    body = { eventId: event._id, userId, symbol, quantity: String(quantity), rewardedAt: new Date(rewardedAt).toISOString(), journalId: journal._id, fees: fees || {} };

    if (s) await IdempotencyKey.create([{ _id: key, requestHash: payloadHash, response: body }], { session: s });
    else await IdempotencyKey.create([{ _id: key, requestHash: payloadHash, response: body }]);
  };

  try {
    try {
      await session.withTransaction(async () => { await exec(session); });
    } catch (txErr) {
      const msg = String(txErr && txErr.message || '').toLowerCase();
      if (msg.includes('transaction') || msg.includes('replica set') || msg.includes('mongos')) {
        await exec(null);
      } else {
        throw txErr;
      }
    }
    return res.status(status).json(body);
  } catch (e) {
    console.error('postReward error:', e);
    if (String(e.message).startsWith('VALIDATION:SYMBOL')) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Unknown symbol' } });
    }
    if (String(e.message).startsWith('CONFLICT:KEY')) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'Idempotency key conflict' } });
    }
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  } finally {
    try { session.endSession(); } catch {}
  }
};
