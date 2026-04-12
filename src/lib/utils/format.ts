import { settings } from "$lib/state/settings.svelte";

export type DateFormatType = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD.MM.YYYY" | "DD-MM-YYYY";
export type TimeFormatType = "24h" | "12h";
export type CurrencyCodeType = "EUR" | "USD" | "GBP";
export interface FormatSettings { date_format?: DateFormatType; time_format?: TimeFormatType; currency_code?: CurrencyCodeType }

const DATE_FORMATS: Record<DateFormatType, (day: string, month: string, year: string) => string> = {
	"MM/DD/YYYY": (d, m, y) => `${m}/${d}/${y}`,
	"YYYY-MM-DD": (d, m, y) => `${y}-${m}-${d}`,
	"DD.MM.YYYY": (d, m, y) => `${d}.${m}.${y}`,
	"DD-MM-YYYY": (d, m, y) => `${d}-${m}-${y}`,
	"DD/MM/YYYY": (d, m, y) => `${d}/${m}/${y}`,
};

export function tomorrowAt(hour: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + 1);
	d.setHours(hour, 0, 0, 0);
	return d;
}

export function formatDate(date: string | Date, s?: FormatSettings | null, includeTime = true): string {
	const d = typeof date === "string" ? new Date(date) : date;
	if (isNaN(d.getTime())) return "-";

	const fmt = s?.date_format ?? "DD/MM/YYYY";
	const pad = (n: number) => String(n).padStart(2, "0");
	const [day, month, year] = [pad(d.getDate()), pad(d.getMonth() + 1), String(d.getFullYear())];
	const dateStr = DATE_FORMATS[fmt as DateFormatType](day, month, year);

	if (!includeTime) return dateStr;
	const h24 = d.getHours();
	const min = pad(d.getMinutes());
	const timeStr = s?.time_format === "12h" ? `${h24 % 12 || 12}:${min} ${h24 < 12 ? "AM" : "PM"}` : `${pad(h24)}:${min}`;
	return `${dateStr} ${timeStr}`;
}

export function formatCurrency(value: number, s?: FormatSettings | null): string {
	const currency = s?.currency_code ?? "EUR";
	return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
	USD: "$", GBP: "£", CHF: "CHF", PLN: "zł", CZK: "Kč", SEK: "kr", NOK: "kr", DKK: "kr",
};
export function getCurrencySymbol(code?: CurrencyCodeType | string): string {
	return code ? (CURRENCY_SYMBOLS[code] ?? "€") : "€";
}

export const fmtDate = (date: string | Date, includeTime = true) => formatDate(date, settings.formatSettings, includeTime);
export const fmtCurrency = (value: number) => formatCurrency(value, settings.formatSettings);
export const currentCurrencySymbol = () => getCurrencySymbol(settings.current.currency_code);
