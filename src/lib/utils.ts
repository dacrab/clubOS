import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: unknown }
  ? Omit<T, "child">
  : T;
export type WithoutChildren<T> = T extends { children?: unknown }
  ? Omit<T, "children">
  : T;
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
  w.document.open();
  w.document.write(`<!doctype html><html><head><title>Receipt</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body{font:14px/1.3 ui-sans-serif,system-ui,-apple-system; padding:16px;}
    h1{font-size:16px;margin:0 0 8px}
    table{width:100%;border-collapse:collapse}
    td{padding:4px 0}
    .muted{opacity:.7}
    .total{font-weight:600}
    hr{border:none;border-top:1px dashed #ccc;margin:8px 0}
  </style>
  </head><body>${html}</body></html>`);
  w.document.close();
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
