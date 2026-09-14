import mongoose, { Schema } from "mongoose";
const base = {
  _id: { type: String, required: true },
  companyId: { type: String, required: true },
  createdBy: { type: String, required: true },
  updatedBy: { type: String, required: true },
};
const options = {
  timestamps: true,
  strict: "throw",
  versionKey: false,
} as const;
const company = new Schema(
  {
    _id: String,
    name: String,
    shortName: String,
    status: { type: String, default: "active" },
    baseCurrency: { type: String, enum: ["USD"], default: "USD" },
    fiscalYearStart: { type: String, default: "01-01" },
    lockVersion: { type: Number, default: 0 },
    createdBy: String,
    updatedBy: String,
  },
  options,
);
const account = new Schema(
  {
    ...base,
    code: String,
    name: String,
    type: String,
    subtype: String,
    parentId: String,
    active: Boolean,
    controlAccount: { type: Boolean, default: false },
    allowManualPosting: { type: Boolean, default: true },
    revision: { type: Number, default: 0 },
  },
  options,
);
account.index({ companyId: 1, code: 1 }, { unique: true });
const period = new Schema(
  {
    ...base,
    startDate: String,
    endDate: String,
    status: { type: String, enum: ["open", "closed"], default: "open" },
    closedAt: Date,
    closedBy: String,
  },
  options,
);
period.index({ companyId: 1, startDate: 1, endDate: 1 }, { unique: true });
const line = new Schema(
  { accountId: String, debitCents: Number, creditCents: Number, memo: String },
  { _id: false, strict: "throw" },
);
const journal = new Schema(
  {
    ...base,
    transactionDate: String,
    postingDate: String,
    description: String,
    sourceSystem: String,
    sourceType: String,
    sourceId: String,
    sourceRevision: String,
    sourceHash: String,
    postingOrigin: { type: String, enum: ["manual", "source", "system"] },
    status: { type: String, enum: ["draft", "posted"], default: "draft" },
    lines: [line],
    revision: { type: Number, default: 0 },
    postedAt: Date,
    postedBy: String,
    reversalOf: String,
  },
  options,
);
journal.index(
  {
    companyId: 1,
    sourceSystem: 1,
    sourceType: 1,
    sourceId: 1,
    sourceRevision: 1,
  },
  { unique: true },
);
journal.index(
  { companyId: 1, reversalOf: 1 },
  {
    unique: true,
    partialFilterExpression: { reversalOf: { $type: "string" } },
  },
);
journal.index({ companyId: 1, status: 1, transactionDate: 1 });
const audit = new Schema(
  {
    ...base,
    action: String,
    entityId: String,
    reason: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
  },
  options,
);
export const Company =
  mongoose.models.Company || mongoose.model("Company", company);
export const Account =
  mongoose.models.Account || mongoose.model("Account", account);
export const Period =
  mongoose.models.Period || mongoose.model("Period", period);
export const Journal =
  mongoose.models.Journal || mongoose.model("Journal", journal);
export const Audit = mongoose.models.Audit || mongoose.model("Audit", audit);
export async function ensureIndexes() {
  for (const model of [Company, Account, Period, Journal, Audit])
    await model.createIndexes();
}
