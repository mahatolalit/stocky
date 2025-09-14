const { Schema, model } = require('mongoose');

const PriceHistorySchema = new Schema({
  symbol: { type: String, required: true, uppercase: true },
  asOf: { type: Date, required: true },
  priceInr: { type: Schema.Types.Decimal128, required: true },
  source: { type: String }
}, { versionKey: false });

PriceHistorySchema.index({ symbol: 1, asOf: -1 }, { unique: true });

module.exports = model('PriceHistory', PriceHistorySchema, 'price_history');
