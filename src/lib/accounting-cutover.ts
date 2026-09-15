// Approved planning boundary, not an automatic authority switch or posting permission.
export const PIONEER_COMPANY = "pioneer-industries";
export const QUICKBOOKS_OFFICIAL_THROUGH = "2026-12-31";
export const FINANCE_PLANNED_START = "2027-01-01";
export const PIONEER_2027_PERIODS = Array.from({ length: 12 }, (_, index) => ({
  startDate: `2027-${String(index + 1).padStart(2, "0")}-01`,
  endDate: `2027-${String(index + 1).padStart(2, "0")}-${[31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][index]}`,
}));
