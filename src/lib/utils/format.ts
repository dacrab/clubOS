/**
 * Formatting utilities for dates, times, and currency
 * These use settings from the database for consistent formatting across the app
 */

import { settings } from "$lib/state/settings.svelte";

export type DateFormatType = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD" | "DD.MM.YYYY" | "DD-MM-YYYY";
export type TimeFormatType = "24h" | "12h";
export type CurrencyCodeType = "EUR" | "USD" | "GBP";

export interface FormatSettings {
	date_format?: DateFormatType;
	time_format?: TimeFormatType;
	currency_code?: CurrencyCodeType;
}

/**
 * Format a date string according to settings
 */
export function formatDate(
	date: string | Date,
	settings?: FormatSettings | null,
	includeTime = true
): string {
	const d = typeof date === "string" ? new Date(date) : date;
	if (isNaN(d.getTime())) return "-";

	const dateFormat = settings?.date_format ?? "DD/MM/YYYY";
	const timeFormat = settings?.time_format ?? "24h";

	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();

	let dateStr: string;
	switch (dateFormat) {
		case "MM/DD/YYYY":
			dateStr = `${month}/${day}/${year}`;
			break;
		case "YYYY-MM-DD":
			dateStr = `${year}-${month}-${day}`;
			break;
		case "DD.MM.YYYY":
			dateStr = `${day}.${month}.${year}`;
			break;
		case "DD-MM-YYYY":
			dateStr = `${day}-${month}-${year}`;
			break;
		case "DD/MM/YYYY":
		default:
			dateStr = `${day}/${month}/${year}`;
			break;
	}

	if (!includeTime) return dateStr;

	const hours24 = d.getHours();
	const minutes = String(d.getMinutes()).padStart(2, "0");

	let timeStr: string;
	if (timeFormat === "12h") {
		const hours12 = hours24 % 12 || 12;
		const ampm = hours24 < 12 ? "AM" : "PM";
		timeStr = `${hours12}:${minutes} ${ampm}`;
	} else {
		timeStr = `${String(hours24).padStart(2, "0")}:${minutes}`;
	}

	return `${dateStr} ${timeStr}`;
}

/**
 * Format a number as currency according to settings
 */
export function formatCurrency(
	value: number,
	settings?: FormatSettings | null
): string {
	const currency = settings?.currency_code ?? "EUR";
	const locale = currency === "USD" ? "en-US" : currency === "GBP" ? "en-GB" : "de-DE";
	
	return new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
	}).format(value);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode?: CurrencyCodeType): string {
	switch (currencyCode) {
		case "USD":
			return "$";
		case "GBP":
			return "£";
		case "EUR":
		default:
			return "€";
	}
}

/**
 * Format date using global settings (for components that don't have direct access to settings)
 */
export function fmtDate(date: string | Date, includeTime = true): string {
	return formatDate(date, settings.formatSettings, includeTime);
}

/**
 * Format currency using global settings (for components that don't have direct access to settings)
 */
export function fmtCurrency(value: number): string {
	return formatCurrency(value, settings.formatSettings);
}

/**
 * Get current currency symbol from global settings
 */
export function currentCurrencySymbol(): string {
	return getCurrencySymbol(settings.current.currency_code);
}
