const { Schema, model } = require('mongoose');

const StockSymbolSchema = new Schema({
  _id: { type: String, uppercase: true, trim: true },
  name: { type: String, required: true },
  exchange: { type: String, enum: ['NSE','BSE'], required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: false, versionKey: false });

module.exports = model('StockSymbol', StockSymbolSchema, 'stock_symbols');
