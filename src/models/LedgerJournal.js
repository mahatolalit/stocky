const { Schema, model } = require('mongoose');

const MoneyEntry = new Schema({
  account: { type: String, enum: ['Cash','Inventory:SharesPurchased','Expense:Brokerage','Expense:STT','Expense:GST','Expense:Other'], required: true },
  amountInr: { type: Schema.Types.Decimal128, required: true }
}, { _id: false });

const UnitEntry = new Schema({
  userId: { type: String, required: true },
  symbol: { type: String, required: true, uppercase: true },
  quantity: { type: Schema.Types.Decimal128, required: true }
}, { _id: false });

const LedgerJournalSchema = new Schema({
  _id: { type: String, default: () => require('crypto').randomUUID() },
  eventId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  memo: { type: String },
  moneyEntries: { type: [MoneyEntry], default: [] },
  unitEntries: { type: [UnitEntry], default: [] }
}, { versionKey: false });

LedgerJournalSchema.index({ eventId: 1 });
LedgerJournalSchema.index({ 'unitEntries.userId': 1, 'unitEntries.symbol': 1 });

module.exports = model('LedgerJournal', LedgerJournalSchema, 'ledger_journals');
