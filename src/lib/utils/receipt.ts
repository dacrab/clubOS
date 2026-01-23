/**
 * Receipt printing utility for POS
 */
import { t } from "$lib/i18n/index.svelte";
import { fmtCurrency } from "$lib/utils/format";
import type { CartItem } from "$lib/types/database";

export interface ReceiptData {
	items: CartItem[];
	total: number;
	discount: number;
	couponCount: number;
	orderId: string | null;
}

/**
 * Opens a print dialog with a formatted receipt
 */
export function printReceipt(data: ReceiptData): void {
	if (!data.items.length) return;

	const w = window.open("", "_blank", "width=300,height=600");
	if (!w) return;

	const itemsHtml = data.items
		.map(
			(i) =>
				`<div class="item"><span>${i.quantity}x ${i.product.name}${i.isTreat ? ` (${t("orders.treat")})` : ""}</span><span>${i.isTreat ? "-" : fmtCurrency(i.product.price * i.quantity)}</span></div>`
		)
		.join("");

	const discountHtml =
		data.discount > 0
			? `<div class="item"><span>${t("orders.discount")} (${data.couponCount} ${t("orders.coupons").toLowerCase()})</span><span>-${fmtCurrency(data.discount)}</span></div>`
			: "";

	const html = `<!DOCTYPE html>
<html><head><title>${t("orders.receipt")}</title>
<style>
body{font-family:monospace;font-size:12px;padding:10px;max-width:280px}
h2{text-align:center;margin:0 0 10px}
hr{border:none;border-top:1px dashed #000;margin:8px 0}
.item{display:flex;justify-content:space-between}
.total{font-weight:bold;font-size:14px}
.center{text-align:center}
</style></head>
<body>
<h2>${t("orders.receipt")}</h2>
<p class="center">${new Date().toLocaleString()}</p>
<hr>
${itemsHtml}
<hr>
<div class="item"><span>${t("orders.subtotal")}</span><span>${fmtCurrency(data.total + data.discount)}</span></div>
${discountHtml}
<div class="item total"><span>${t("orders.total")}</span><span>${fmtCurrency(data.total)}</span></div>
<hr>
<p class="center">${t("orders.thankYou")}</p>
<p class="center">#${data.orderId?.slice(0, 8) ?? "N/A"}</p>
</body></html>`;

	w.document.write(html);
	w.document.close();
	w.print();
}
