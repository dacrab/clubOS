import { settings } from "$lib/state/settings.svelte";

export type DateFormatType = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD.MM.YYYY" | "DD-MM-YYYY";
export type TimeFormatType = "24h" | "12h";
export type CurrencyCodeType = "EUR" | "USD" | "GBP";
export interface FormatSettings { date_format?: DateFormatType; time_format?: TimeFormatType; currency_code?: CurrencyCodeType }

export function tomorrowAt(hour: number): Date {
	const d = new Date(Date.now() + 86_400_000);
	d.setHours(hour, 0, 0, 0);
	return d;
}

export function formatDate(date: string | Date, s?: FormatSettings | null, includeTime = true): string {
	const d = typeof date === "string" ? new Date(date) : date;
	if (isNaN(d.getTime())) return "-";

	const fmt = s?.date_format ?? "DD/MM/YYYY";
	const pad = (n: number): string => String(n).padStart(2, "0");
	const [day, month, year] = [pad(d.getDate()), pad(d.getMonth() + 1), d.getFullYear()];
	const dateStr =
		fmt === "MM/DD/YYYY" ? `${month}/${day}/${year}` :
		fmt === "YYYY-MM-DD" ? `${year}-${month}-${day}` :
		fmt === "DD.MM.YYYY" ? `${day}.${month}.${year}` :
		fmt === "DD-MM-YYYY" ? `${day}-${month}-${year}` :
		`${day}/${month}/${year}`;

	if (!includeTime) return dateStr;
	const h24 = d.getHours();
	const min = pad(d.getMinutes());
	const timeStr = s?.time_format === "12h" ? `${h24 % 12 || 12}:${min} ${h24 < 12 ? "AM" : "PM"}` : `${pad(h24)}:${min}`;
	return `${dateStr} ${timeStr}`;
}

export function formatCurrency(value: number, s?: FormatSettings | null): string {
	const currency = s?.currency_code ?? "EUR";
	// Use undefined locale so the runtime picks the best locale for the currency
	return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
	USD: "$", GBP: "£", CHF: "CHF", PLN: "zł", CZK: "Kč", SEK: "kr", NOK: "kr", DKK: "kr",
};
export function getCurrencySymbol(code?: CurrencyCodeType | string): string {
	return code ? (CURRENCY_SYMBOLS[code] ?? "€") : "€";
}

export const fmtDate = (date: string | Date, includeTime = true): string => formatDate(date, settings.formatSettings, includeTime);
export const fmtCurrency = (value: number): string => formatCurrency(value, settings.formatSettings);
export const currentCurrencySymbol = (): string => getCurrencySymbol(settings.current.currency_code);
