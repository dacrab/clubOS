<script lang="ts">
import { AlertTriangle } from "@lucide/svelte";
import { Badge } from "$lib/components/ui/badge";
import { facilityState } from "$lib/state/facility.svelte";
import { t } from "$lib/state/i18n.svelte";
import { supabase } from "$lib/utils/supabase";

const DEFAULT_LOW_STOCK_THRESHOLD = 3;
const { threshold: propThreshold } = $props<{ threshold?: number }>();
let threshold = $state<number>(propThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
let items = $state<Array<{ id: string; name: string; stock_quantity: number }>>([]);

async function load() {
	try {
		const { data: sessionData } = await supabase.auth.getUser();
		const uid = sessionData.user?.id;
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
					.maybeSingle();
				if (settings?.low_stock_threshold != null) threshold = Number(settings.low_stock_threshold);
			}
		}
	} catch {}

	const { data: sessionData } = await supabase.auth.getUser();
	const uid = sessionData.user?.id;
	if (!uid) return;
	const { data: tm } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", uid)
		.limit(1);
	const tenantId = tm?.[0]?.tenant_id;
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

{#if items.length === 0}
  <div class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-t border-border/40">
    <AlertTriangle class="size-8 opacity-20 mb-3" />
    <p class="text-sm font-medium text-foreground">{t("inventory.lowStock.empty")}</p>
    <p class="text-xs">All products are well stocked</p>
  </div>
{:else}
  <div class="divide-y divide-border/40">
    {#each items as item}
      <div class="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
        <div class="flex items-center gap-3 min-w-0">
          <div class="grid size-8 place-items-center rounded-md bg-destructive/10 text-destructive">
            <AlertTriangle class="size-4" />
          </div>
          <div class="truncate">
            <p class="text-sm font-medium text-foreground truncate">{item.name}</p>
            <p class="text-xs text-muted-foreground">{t("inventory.lowStock.threshold")}</p>
          </div>
        </div>
        <Badge variant={item.stock_quantity <= 1 ? "destructive" : "outline"} class="ml-2">
          {item.stock_quantity} left
        </Badge>
      </div>
    {/each}
  </div>
{/if}
