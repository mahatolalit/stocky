const RewardEvent = require('../models/RewardEvent');
const UnitAccount = require('../models/UnitAccount');
const PriceHistory = require('../models/PriceHistory');
const DailyUserValuation = require('../models/DailyUserValuation');

function istRange(date = new Date()) {
  const IST_OFFSET_MIN = 330;
  const utcMs = date.getTime();
  const istMs = utcMs + IST_OFFSET_MIN * 60 * 1000;
  const istDate = new Date(istMs);
  const y = istDate.getUTCFullYear();
  const m = istDate.getUTCMonth();
  const d = istDate.getUTCDate();
  const startIst = new Date(Date.UTC(y, m, d, 0, 0, 0));
  const endIst = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));
  const startUtc = new Date(startIst.getTime() - IST_OFFSET_MIN * 60 * 1000);
  const endUtc = new Date(endIst.getTime() - IST_OFFSET_MIN * 60 * 1000);
  return { startUtc, endUtc, dateIst: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

exports.todayStocks = async (req, res) => {
  const userId = req.params.userId;
  try {
    const { startUtc, endUtc, dateIst } = istRange(new Date());
    const events = await RewardEvent.find({ userId, rewardedAt: { $gte: startUtc, $lt: endUtc } })
      .select('_id symbol quantity rewardedAt')
      .sort({ rewardedAt: 1 })
      .lean();
    return res.json({ userId, businessDateIst: dateIst, events: events.map(e => ({ eventId: e._id, symbol: e.symbol, quantity: e.quantity.toString(), rewardedAt: e.rewardedAt.toISOString() })) });
  } catch (e) {
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
};

exports.historicalInr = async (req, res) => {
  const userId = req.params.userId;
  try {
    const q = { userId };
    if (req.query.startDate || req.query.endDate) {
      q.dateIst = {};
      if (req.query.startDate) q.dateIst.$gte = new Date(req.query.startDate + 'T00:00:00Z');
      if (req.query.endDate) q.dateIst.$lte = new Date(req.query.endDate + 'T23:59:59Z');
    }
    const items = await DailyUserValuation.find(q).sort({ dateIst: 1 }).lean();
    return res.json({ userId, currency: 'INR', items: items.map(i => ({ date: i.dateIst.toISOString().slice(0,10), valueInr: i.totalValueInr.toString() })) });
  } catch (e) {
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
};

exports.stats = async (req, res) => {
  const userId = req.params.userId;
  try {
    const { startUtc, endUtc, dateIst } = istRange(new Date());
    const todayAgg = await RewardEvent.aggregate([
      { $match: { userId, rewardedAt: { $gte: startUtc, $lt: endUtc } } },
      { $group: { _id: '$symbol', quantity: { $sum: '$quantity' } } },
      { $project: { _id: 0, symbol: '$_id', quantity: 1 } }
    ]);
    const positions = await UnitAccount.find({ userId }).lean();
    const symbols = positions.map(p => p.symbol);
    const latestPrices = await PriceHistory.aggregate([
      { $match: { symbol: { $in: symbols } } },
      { $sort: { symbol: 1, asOf: -1 } },
      { $group: { _id: '$symbol', priceInr: { $first: '$priceInr' }, asOf: { $first: '$asOf' } } }
    ]);
    const priceMap = new Map(latestPrices.map(p => [p._id, p]));
    let total = 0; let asOf = null;
    for (const p of positions) {
      const pr = priceMap.get(p.symbol);
      if (pr) {
        total += Number(p.balance.toString()) * Number(pr.priceInr.toString());
        if (!asOf || pr.asOf > asOf) asOf = pr.asOf;
      }
    }
    const stale = asOf ? (Date.now() - asOf.getTime() > 2 * 60 * 60 * 1000) : true;
    return res.json({ userId, today: { dateIst, bySymbol: todayAgg.map(x => ({ symbol: x.symbol, quantity: x.quantity.toString() })) }, portfolio: { asOf: asOf ? asOf.toISOString() : null, stale, totalInr: total.toFixed(4) } });
  } catch (e) {
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
};

exports.portfolio = async (req, res) => {
  const userId = req.params.userId;
  try {
    const positions = await UnitAccount.find({ userId }).lean();
    const symbols = positions.map(p => p.symbol);
    const latestPrices = await PriceHistory.aggregate([
      { $match: { symbol: { $in: symbols } } },
      { $sort: { symbol: 1, asOf: -1 } },
      { $group: { _id: '$symbol', priceInr: { $first: '$priceInr' }, asOf: { $first: '$asOf' } } }
    ]);
    const priceMap = new Map(latestPrices.map(p => [p._id, p]));
    let asOf = null;
    const items = positions.map(p => {
      const pr = priceMap.get(p.symbol);
      const qty = Number(p.balance.toString());
      const price = pr ? Number(pr.priceInr.toString()) : 0;
      const value = +(qty * price).toFixed(4);
      if (pr) { if (!asOf || pr.asOf > asOf) asOf = pr.asOf; }
      return { symbol: p.symbol, quantity: p.balance.toString(), priceInr: pr ? pr.priceInr.toString() : null, valueInr: value.toFixed(4) };
    });
    const stale = asOf ? (Date.now() - asOf.getTime() > 2 * 60 * 60 * 1000) : true;
    return res.json({ userId, asOf: asOf ? asOf.toISOString() : null, stale, positions: items, totalInr: items.reduce((s,i)=>s+Number(i.valueInr),0).toFixed(4) });
  } catch (e) {
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
  }
};
