import { z } from "zod";

export const lineItemSchema = z.object({
  name: z.string().min(1, "Description required"),
  description: z.string().optional(),
  sacCode: z.string().optional(),
  qty: z.coerce.number().positive(),
  unit: z.string().optional(),
  rate: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(28),
});

export const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Pick a client"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  currency: z.string().default("INR"),
  // optional manual override of the resolved supply type
  supplyType: z
    .enum(["INTRA_STATE", "INTER_STATE", "EXPORT_LUT", "EXPORT_WITH_TAX"])
    .optional(),
  discountType: z.enum(["PERCENT", "FLAT"]).default("PERCENT"),
  discountValue: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one line"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const createQuoteSchema = z.object({
  clientId: z.string().min(1, "Pick a client"),
  issueDate: z.coerce.date(),
  validTill: z.coerce.date(),
  currency: z.string().default("INR"),
  supplyType: z
    .enum(["INTRA_STATE", "INTER_STATE", "EXPORT_LUT", "EXPORT_WITH_TAX"])
    .optional(),
  discountType: z.enum(["PERCENT", "FLAT"]).default("PERCENT"),
  discountValue: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one line"),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;

export const createRecurringSchema = z.object({
  title: z.string().optional(),
  clientId: z.string().min(1, "Pick a client"),
  cadence: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  nextRunDate: z.coerce.date(),
  currency: z.string().default("INR"),
  supplyType: z.enum(["INTRA_STATE", "INTER_STATE", "EXPORT_LUT", "EXPORT_WITH_TAX"]).optional(),
  discountType: z.enum(["PERCENT", "FLAT"]).default("PERCENT"),
  discountValue: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one line"),
});

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;

export const catalogItemSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  kind: z.enum(["SERVICE", "PRODUCT"]).default("SERVICE"),
  sacCode: z.string().optional(),
  defaultRate: z.coerce.number().min(0),
  defaultTax: z.coerce.number().min(0).max(28).default(18),
});

export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["BANK_TRANSFER", "UPI", "RAZORPAY", "CRYPTO", "OTHER"]).default("BANK_TRANSFER"),
  reference: z.string().optional(),
  paidAt: z.coerce.date(),
  notes: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const clientSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  billingAddress: z.string().optional(),
  country: z.string().default("IN"),
  stateCode: z.string().optional(),
  gstin: z.string().optional(),
  defaultCurrency: z.string().default("INR"),
  notes: z.string().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;
