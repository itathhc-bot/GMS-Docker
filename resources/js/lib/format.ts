/**
 * Currency formatting helpers — all amounts are in AED.
 * Switch the locale based on i18n language for correct numeral formatting.
 */
export function formatCurrency(value: number, opts?: { compact?: boolean; locale?: string }): string {
  const locale = opts?.locale ?? "en-AE";
  if (opts?.compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "AED",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(value);
}

export const CURRENCY_CODE = "AED";
export const CURRENCY_SYMBOL = "د.إ";
