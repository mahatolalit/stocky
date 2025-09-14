const { Schema, model } = require('mongoose');

const RewardEventSchema = new Schema({
  _id: { type: String, default: () => require('crypto').randomUUID() },
  userId: { type: String, required: true },
  symbol: { type: String, required: true, uppercase: true },
  quantity: { type: Schema.Types.Decimal128, required: true },
  rewardedAt: { type: Date, required: true },
  note: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

RewardEventSchema.index({ userId: 1, rewardedAt: -1 });
RewardEventSchema.index({ symbol: 1, rewardedAt: -1 });
RewardEventSchema.index({ userId: 1, symbol: 1, quantity: 1, rewardedAt: 1 }, { unique: true });

module.exports = model('RewardEvent', RewardEventSchema, 'reward_events');
