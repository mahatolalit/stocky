const { Schema, model } = require('mongoose');

const IdemSchema = new Schema({
  _id: { type: String },
  requestHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 72 },
  response: { type: Schema.Types.Mixed }
}, { versionKey: false });

module.exports = model('IdempotencyKey', IdemSchema, 'idempotency_keys');
