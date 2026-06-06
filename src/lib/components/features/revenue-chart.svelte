<script lang="ts">
import { BarChart3 } from "@lucide/svelte";
import { t } from "$lib/i18n/index.svelte";
import { currentCurrencySymbol, fmtCurrency } from "$lib/utils/format";

type Day = { date: string; revenue: number };
type Props = { days: Day[] };
let { days }: Props = $props();

const HEIGHT = 240;
const PAD = { top: 8, right: 8, bottom: 32, left: 56 };
const GAP = 0.3;
const TICKS = [0, 0.25, 0.5, 0.75, 1];

const max = $derived(Math.max(...days.map((d) => d.revenue), 1));
const innerW = $derived(400 - PAD.left - PAD.right);
const innerH = $derived(HEIGHT - PAD.top - PAD.bottom);
const barW = $derived(((1 - GAP) * innerW) / days.length);

const x = (i: number): number =>
	PAD.left + (i / days.length) * innerW + (GAP * innerW) / days.length / 2;

let tip = $state<{ x: number; y: number; date: string; revenue: number } | null>(null);
const hasData = $derived(days.some((d) => d.revenue > 0));
</script>

{#if hasData}
	<div class="relative h-64" role="img" aria-label={t("dashboard.weeklyRevenue")}>
		<svg class="w-full h-full" viewBox="0 0 400 {HEIGHT}">
			{#each TICKS as tick (tick)}
				{@const y = PAD.top + (1 - tick) * innerH}
				<line x1={PAD.left} x2={400 - PAD.right} y1={y} y2={y} class="stroke-border" stroke-dasharray="4 4" />
				<text x={PAD.left - 8} y={y + 4} text-anchor="end" class="fill-muted-foreground text-[10px]">
					{currentCurrencySymbol()}{Math.round(tick * max)}
				</text>
			{/each}
			{#each days as day, i (day.date)}
				{@const h = (day.revenue / max) * innerH}
				{@const bx = x(i)}
				<rect
					x={bx} y={HEIGHT - PAD.bottom - h} width={barW} height={h}
					rx="4"
					role="graphics-symbol"
					aria-label="{day.date}: {fmtCurrency(day.revenue)}"
					class="fill-primary transition-all duration-200 hover:fill-primary/80 cursor-pointer"
					onmouseenter={(e) => tip = { x: e.clientX, y: e.clientY, date: day.date, revenue: day.revenue }}
					onmouseleave={() => tip = null}
				/>
				<text x={bx + barW / 2} y={HEIGHT - 8} text-anchor="middle" class="fill-muted-foreground text-[10px]">
					{day.date}
				</text>
			{/each}
		</svg>
		{#if tip}
			<div
				class="fixed z-50 px-3 py-2 text-sm bg-popover border rounded-lg shadow-lg pointer-events-none"
				style="left: {tip.x + 12}px; top: {tip.y - 40}px;"
			>
				<p class="font-medium">{tip.date}</p>
				<p class="text-muted-foreground">{t("dashboard.revenue")}: {fmtCurrency(tip.revenue)}</p>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex h-64 flex-col items-center justify-center text-muted-foreground">
		<BarChart3 class="h-12 w-12 opacity-30 mb-2" />
		<p class="text-sm">{t("common.noResults")}</p>
	</div>
{/if}
