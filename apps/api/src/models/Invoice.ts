import mongoose, { Schema, Document } from 'mongoose';

export interface ILineItem {
  description: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface IVendor {
  name: string;
  address?: string;
  taxId?: string;
}

export interface IInvoiceData {
  number: string;
  date: string;
  currency?: string;
  subtotal?: number;
  taxPercent?: number;
  total?: number;
  poNumber?: string;
  poDate?: string;
  lineItems: ILineItem[];
}

export interface IInvoice extends Document {
  fileId: string;
  fileName: string;
  vendor: IVendor;
  invoice: IInvoiceData;
  createdAt: Date;
  updatedAt?: Date;
}

const LineItemSchema = new Schema({
  description: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  total: { type: Number, required: true }
});

const VendorSchema = new Schema({
  name: { type: String, required: true },
  address: { type: String },
  taxId: { type: String }
});

const InvoiceDataSchema = new Schema({
  number: { type: String, required: true },
  date: { type: String, required: true },
  currency: { type: String },
  subtotal: { type: Number },
  taxPercent: { type: Number },
  total: { type: Number },
  poNumber: { type: String },
  poDate: { type: String },
  lineItems: [LineItemSchema]
});

const InvoiceSchema = new Schema({
  fileId: { type: String, required: true },
  fileName: { type: String, required: true },
  vendor: { type: VendorSchema, required: true },
  invoice: { type: InvoiceDataSchema, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);