import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, "child"> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
	ref?: U | null;
};

// Lightweight receipt printing helper
export function openPrintWindow(html: string): void {
	if (typeof window === "undefined") {
		return;
	}
	const w = window.open("", "_blank", "width=380,height=600");
	if (!w) {
		return;
	}
	const doc = w.document;
	doc.title = "Receipt";
	doc.body.innerHTML = `
  <style>
    body{font:14px/1.3 ui-sans-serif,system-ui,-apple-system; padding:16px;}
    h1{font-size:16px;margin:0 0 8px}
    table{width:100%;border-collapse:collapse}
    td{padding:4px 0}
    .muted{opacity:.7}
    .total{font-weight:600}
    hr{border:none;border-top:1px dashed #ccc;margin:8px 0}
  </style>
  ${html}`;
	// Give the window a tick to render before printing
	const printDelayMs = 100;
	setTimeout(() => {
		try {
			w.focus();
			w.print();
		} catch {
			/* noop */
		}
	}, printDelayMs);
}

// Consistent date-time formatting: DD/MM/YY HH:mm (24h)
export function formatDateTime(value: string | number | Date): string {
	const d = new Date(value);
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(d);
}

// Currency formatting (EUR)
export function formatCurrency(value: number): string {
	return `€${value.toFixed(2)}`;
}
