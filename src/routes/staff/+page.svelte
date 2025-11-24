<script lang="ts">
import { LogOut, ShoppingCart } from "@lucide/svelte";
import NewSaleDialog from "$lib/components/features/new-sale-dialog.svelte";
import RecentOrders from "$lib/components/features/recent-orders.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import { tt as t } from "$lib/state/i18n.svelte";
import { registerState } from "$lib/state/register.svelte";
import { salesState } from "$lib/state/sales.svelte";
import { userState } from "$lib/state/user.svelte";
import { supabase } from "$lib/utils/supabase";

let closing = $state(false);
let showCloseDialog = $state(false);
let staffName = $state("");
let notes = $state("");
// removed finalCash; not collected anymore
let showSale = $state(false);
const productsForSale: Array<{
	id: string;
	name: string;
	price: number;
	category_id?: string | null;
}> = $state([]);

$effect(() => {
	userState.load();
});

async function onCloseRegister() {
	if (!staffName.trim()) {
		return;
	}

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;

	const sessionId = await registerState.ensureOpenSession(user.id);
	closing = true;

	try {
		await registerState.close(sessionId, {
			staff_name: staffName,
			notes,
		});

		showCloseDialog = false;
		staffName = "";
		notes = "";
	} finally {
		closing = false;
	}
}

async function createSale(payload: {
	items: Array<{
		id: string;
		name: string;
		price: number;
		is_treat?: boolean;
	}>;
	paymentMethod: "cash";
	couponCount: number;
}) {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;
	await salesState.create(user.id, payload);
}
</script>

<PageContent>
  <PageHeader
    title={t("dashboard.staff.title")}
    subtitle={t("dashboard.staff.quickActions")}
    icon={ShoppingCart}
  />

  <div class="grid gap-5 lg:grid-cols-2">
    <Card
      class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
    >
      <div class="flex flex-col gap-5 px-6 py-6">
        <div class="flex items-start gap-4">
          <span
            class="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"
          >
            <ShoppingCart class="size-5" />
          </span>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-semibold uppercase text-muted-foreground">
              {t("dashboard.staff.pos")}
            </span>
            <p class="text-sm text-muted-foreground">
              {t("dashboard.staff.posDesc")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          onclick={() => (showSale = true)}
          size="lg"
          class="h-12 rounded-lg text-base font-semibold"
        >
          <ShoppingCart class="mr-2.5 h-5 w-5" />
          {t("orders.new")}
        </Button>
      </div>
    </Card>

    <Card
      class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
    >
      <div class="flex flex-col gap-4 px-6 py-6">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase text-muted-foreground">
            {t("dashboard.staff.register")}
          </span>
          <p class="text-sm text-muted-foreground">
            {t("dashboard.staff.closePromptDesc")}
          </p>
        </div>
        <Button
          type="button"
          onclick={() => (showCloseDialog = true)}
          disabled={closing}
          variant="destructive"
          class="h-12 rounded-lg text-base font-semibold"
        >
          <LogOut class="mr-2.5 h-4 w-4" />
          {closing
            ? t("dashboard.admin.closing")
            : t("dashboard.staff.closeRegister")}
        </Button>
      </div>
    </Card>
  </div>

  <Card
    class="mt-5 rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
  >
    <div class="flex items-center justify-between gap-2 px-6 py-4">
      <h2 class="text-lg font-semibold text-foreground">
        {t("orders.recent")}
      </h2>
    </div>
    <div class="px-6 pb-6">
      <RecentOrders limit={5} />
    </div>
  </Card>

  <NewSaleDialog
    bind:open={showSale}
    products={productsForSale}
    onSubmit={createSale}
  />

  {#if showCloseDialog}
    <div
      class="fixed inset-0 z-50 grid place-items-center bg-black/55 px-4 py-12"
    >
      <div
        class="w-full max-w-lg rounded-2xl border border-outline-soft/70 bg-card px-6 py-6 shadow-xl"
      >
        <h2 class="text-lg font-semibold text-foreground">
          {t("dashboard.staff.closePromptTitle")}
        </h2>
        <p class="mt-1 text-sm text-muted-foreground">
          {t("dashboard.staff.closePromptDesc")}
        </p>

        <div class="mt-6 flex flex-col gap-4">
          <label
            class="flex flex-col gap-2 text-sm text-muted-foreground"
            for="staffName"
          >
            <span class="font-medium text-foreground"
              >{t("common.name")}
              <span class="text-red-600" aria-hidden="true">*</span></span
            >
            <input
              id="staffName"
              class="w-full rounded-lg border border-outline-soft/70 bg-background px-3 py-2"
              required
              aria-required="true"
              bind:value={staffName}
              placeholder={t("dashboard.staff.required")}
            />
          </label>

          <label
            class="flex flex-col gap-2 text-sm text-muted-foreground"
            for="notes"
          >
            <span class="font-medium text-foreground">{t("common.notes")}</span>
            <textarea
              id="notes"
              class="min-h-24 w-full rounded-lg border border-outline-soft/70 bg-background px-3 py-2"
              bind:value={notes}
              placeholder={t("dashboard.staff.optional")}
            ></textarea>
          </label>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            class="rounded-lg"
            onclick={() => (showCloseDialog = false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            class="rounded-lg"
            onclick={onCloseRegister}
            disabled={closing || !staffName.trim()}
          >
            {t("dashboard.staff.confirmClose")}
          </Button>
        </div>
      </div>
    </div>
  {/if}
</PageContent>
