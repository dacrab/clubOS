import { CURRENCY_OPTIONS } from "$lib/config/settings";
import { settings } from "$lib/state/settings.svelte";

const DATE_FORMATS = {
	"MM/DD/YYYY": (d: string, m: string, y: string) => `${m}/${d}/${y}`,
	"YYYY-MM-DD": (d: string, m: string, y: string) => `${y}-${m}-${d}`,
	"DD.MM.YYYY": (d: string, m: string, y: string) => `${d}.${m}.${y}`,
	"DD-MM-YYYY": (d: string, m: string, y: string) => `${d}-${m}-${y}`,
	"DD/MM/YYYY": (d: string, m: string, y: string) => `${d}/${m}/${y}`,
} as const;

export function tomorrowAt(hour: number): Date {
	const d = new Date();
	d.setDate(d.getDate() + 1);
	d.setHours(hour, 0, 0, 0);
	return d;
}

export function fmtDate(date: string | Date, includeTime = true): string {
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return "-";

	const fmt = settings.current.date_format;
	const pad = (n: number): string => String(n).padStart(2, "0");
	const [day, month, year] = [pad(d.getDate()), pad(d.getMonth() + 1), String(d.getFullYear())];
	const dateStr = DATE_FORMATS[fmt](day, month, year);

	if (!includeTime) return dateStr;
	const h24 = d.getHours();
	const min = pad(d.getMinutes());
	const timeStr =
		settings.current.time_format === "12h"
			? `${h24 % 12 || 12}:${min} ${h24 < 12 ? "AM" : "PM"}`
			: `${pad(h24)}:${min}`;
	return `${dateStr} ${timeStr}`;
}

export function fmtCurrency(value: number): string {
	return new Intl.NumberFormat(undefined, {
		style: "currency",
		currency: settings.current.currency_code,
	}).format(value);
}

/** Format a Date as a local `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM` string. */
export function formatDateTimeLocal(date: Date, withTime = true): string {
	const pad = (n: number): string => String(n).padStart(2, "0");
	const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	if (!withTime) return base;
	return `${base}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const CURRENCY_SYMBOLS = Object.fromEntries(
	CURRENCY_OPTIONS.map((c) => [c.value, c.symbol]),
) as Record<string, string>;

export function currentCurrencySymbol(): string {
	return CURRENCY_SYMBOLS[settings.current.currency_code] ?? "?";
}
