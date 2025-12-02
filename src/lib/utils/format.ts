import { settings } from "$lib/state/settings.svelte";

export type DateFormatType = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD.MM.YYYY" | "DD-MM-YYYY";
export type TimeFormatType = "24h" | "12h";
export type CurrencyCodeType = "EUR" | "USD" | "GBP";
export interface FormatSettings { date_format?: DateFormatType; time_format?: TimeFormatType; currency_code?: CurrencyCodeType }

export function formatDate(date: string | Date, s?: FormatSettings | null, includeTime = true): string {
	const d = typeof date === "string" ? new Date(date) : date;
	if (isNaN(d.getTime())) return "-";

	const fmt = s?.date_format ?? "DD/MM/YYYY";
	const [day, month, year] = [String(d.getDate()).padStart(2, "0"), String(d.getMonth() + 1).padStart(2, "0"), d.getFullYear()];
	
	const dateStr = fmt === "MM/DD/YYYY" ? `${month}/${day}/${year}` : fmt === "YYYY-MM-DD" ? `${year}-${month}-${day}` : fmt === "DD.MM.YYYY" ? `${day}.${month}.${year}` : fmt === "DD-MM-YYYY" ? `${day}-${month}-${year}` : `${day}/${month}/${year}`;
	if (!includeTime) return dateStr;

	const [h24, min] = [d.getHours(), String(d.getMinutes()).padStart(2, "0")];
	const timeStr = s?.time_format === "12h" ? `${h24 % 12 || 12}:${min} ${h24 < 12 ? "AM" : "PM"}` : `${String(h24).padStart(2, "0")}:${min}`;
	return `${dateStr} ${timeStr}`;
}

export function formatCurrency(value: number, s?: FormatSettings | null): string {
	const currency = s?.currency_code ?? "EUR";
	return new Intl.NumberFormat(currency === "USD" ? "en-US" : currency === "GBP" ? "en-GB" : "de-DE", { style: "currency", currency }).format(value);
}

export function getCurrencySymbol(code?: CurrencyCodeType): string {
	return code === "USD" ? "$" : code === "GBP" ? "£" : "€";
}

export const fmtDate = (date: string | Date, includeTime = true): string => formatDate(date, settings.formatSettings, includeTime);
export const fmtCurrency = (value: number): string => formatCurrency(value, settings.formatSettings);
export const currentCurrencySymbol = (): string => getCurrencySymbol(settings.current.currency_code);
