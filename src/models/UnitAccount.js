const { Schema, model } = require('mongoose');

const UnitAccountSchema = new Schema({
  userId: { type: String, required: true },
  symbol: { type: String, required: true, uppercase: true },
  balance: { type: Schema.Types.Decimal128, required: true, default: '0' },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

UnitAccountSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = model('UnitAccount', UnitAccountSchema, 'unit_accounts');
