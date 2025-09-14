const { Schema, model } = require('mongoose');

const DailyUserValuationSchema = new Schema({
  userId: { type: String, required: true },
  dateIst: { type: Date, required: true },
  totalValueInr: { type: Schema.Types.Decimal128, required: true },
  computedAt: { type: Date, default: Date.now }
}, { versionKey: false });

DailyUserValuationSchema.index({ userId: 1, dateIst: 1 }, { unique: true });

module.exports = model('DailyUserValuation', DailyUserValuationSchema, 'daily_user_valuation');
