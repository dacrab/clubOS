<script lang="ts">
import Badge from "$lib/components/ui/badge/badge.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import CardContent from "$lib/components/ui/card/card-content.svelte";
import CardDescription from "$lib/components/ui/card/card-description.svelte";
import CardHeader from "$lib/components/ui/card/card-header.svelte";
import CardTitle from "$lib/components/ui/card/card-title.svelte";
import { facilityState } from "$lib/state/facility.svelte";
import { tt as t } from "$lib/state/i18n.svelte";
import { supabase } from "$lib/utils/supabase";

((..._args: unknown[]) => {
	return;
})(Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, t);

const DEFAULT_LOW_STOCK_THRESHOLD = 3;

const props = $props<{ threshold?: number }>();
let threshold = $state<number>(props.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
let items: Array<{ id: string; name: string; stock_quantity: number }> = $state(
	[],
);

async function load() {
	// Load threshold from tenant_settings (fallback to prop/default)
	try {
		const { data: sessionData } = await supabase.auth.getSession();
		const uid = sessionData.session?.user.id;
		if (uid) {
			const { data: memberships } = await supabase
				.from("tenant_members")
				.select("tenant_id")
				.eq("user_id", uid);
			const tenantId = memberships?.[0]?.tenant_id;
			if (tenantId) {
				const { data: settings } = await supabase
					.from("tenant_settings")
					.select("low_stock_threshold")
					.eq("tenant_id", tenantId)
					.is("facility_id", null)
					.limit(1)
					.maybeSingle();
				if (settings && settings.low_stock_threshold != null) {
					threshold = Number(settings.low_stock_threshold);
				}
			}
		}
	} catch (/** intentionally ignore: fallback to default threshold */ _err) {
		/* no-op */
	}
	// Determine tenant and selected facility
	let tenantId: string | null = null;
	const { data: sessionData } = await supabase.auth.getSession();
	const uid = sessionData.session?.user.id ?? "";
	const { data: tm } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", uid)
		.limit(1);
	tenantId = (tm?.[0]?.tenant_id as string | undefined) ?? null;
	const facilityId = await facilityState.resolveSelected();
	let q = supabase
		.from("products")
		.select("id,name,stock_quantity")
		.order("stock_quantity", { ascending: true })
		.lte("stock_quantity", threshold)
		.neq("stock_quantity", -1);
	if (tenantId) q = q.eq("tenant_id", tenantId);
	if (facilityId) q = q.eq("facility_id", facilityId);
	const { data } = await q;
	items = (data ?? []) as Array<{
		id: string;
		name: string;
		stock_quantity: number;
	}>;
}

$effect(() => {
	load();
});
</script>

<Card class="rounded-3xl border border-outline-soft bg-surface shadow-sm">
  <CardHeader class="flex flex-col gap-2 border-b border-outline-soft/60 p-5">
    <div class="flex items-center justify-between">
      <CardTitle class="text-sm font-semibold uppercase text-muted-foreground">
        {t("inventory.lowStock.title")}
      </CardTitle>
      <Badge
        variant="secondary"
        class="rounded-full px-3 py-1 text-xs font-medium"
      >
        {items.length}
      </Badge>
    </div>
    <CardDescription class="text-xs text-muted-foreground">
      {t("inventory.lowStock.subtitle") ?? t("inventory.lowStock.empty")}
    </CardDescription>
  </CardHeader>
  <CardContent class="p-5">
    {#if items.length === 0}
      <div
        class="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-outline-soft/60 bg-surface-strong/40 px-6 py-10 text-center text-sm text-muted-foreground"
      >
        {t("inventory.lowStock.empty")}
      </div>
    {:else}
      <ul class="space-y-2">
        {#each items as it}
          <li
            class="rounded-2xl border border-outline-soft/50 bg-surface-strong/40 px-4 py-3 text-sm"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <span class="block truncate font-medium text-foreground"
                  >{it.name}</span
                >
                <span class="text-xs text-muted-foreground"
                  >{t("inventory.lowStock.threshold") ?? ""}</span
                >
              </div>
              <Badge
                variant={it.stock_quantity <= 1 ? "destructive" : "secondary"}
                class="badge-pill"
              >
                {it.stock_quantity}
              </Badge>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </CardContent>
</Card>
