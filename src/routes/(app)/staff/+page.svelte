<script lang="ts">
import { LogOut, ShoppingCart } from "@lucide/svelte";
import NewSaleDialog from "$lib/components/features/new-sale-dialog.svelte";
import RecentOrders from "$lib/components/features/recent-orders.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import {
	DialogRoot as Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import { Textarea } from "$lib/components/ui/textarea";
import { t } from "$lib/state/i18n.svelte";
import { registerState } from "$lib/state/register.svelte";
import { salesState } from "$lib/state/sales.svelte";
import { userState } from "$lib/state/user.svelte";
import { supabase } from "$lib/utils/supabase";

let closing = $state(false);
let showCloseDialog = $state(false);
let staffName = $state("");
let notes = $state("");
let showSale = $state(false);
const productsForSale: any[] = $state([]);

$effect(() => {
	userState.load();
});

async function onCloseRegister() {
	if (!staffName.trim()) return;
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;

	const sessionId = await registerState.ensureOpenSession(user.id);
	closing = true;
	try {
		await registerState.close(sessionId, { staff_name: staffName, notes });
		showCloseDialog = false;
		staffName = "";
		notes = "";
	} finally {
		closing = false;
	}
}

async function createSale(payload: any) {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;
	await salesState.create(user.id, payload);
}
</script>

<PageContent>
  <PageHeader title={t("dashboard.staff.title")} subtitle={t("dashboard.staff.quickActions")} />

  <div class="grid gap-6 lg:grid-cols-2">
    <Card class="border-border shadow-sm">
      <div class="p-6 flex flex-col gap-6">
        <div class="flex items-start gap-4">
          <div class="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShoppingCart class="size-6" />
          </div>
          <div class="space-y-1">
            <h3 class="font-semibold leading-none">{t("dashboard.staff.pos")}</h3>
            <p class="text-sm text-muted-foreground">{t("dashboard.staff.posDesc")}</p>
          </div>
        </div>
        <Button type="button" onclick={() => (showSale = true)} size="lg" class="w-full">
          <ShoppingCart class="mr-2 h-5 w-5" />
          {t("orders.new")}
        </Button>
      </div>
    </Card>

    <Card class="border-border shadow-sm">
      <div class="p-6 flex flex-col gap-6">
        <div class="space-y-1">
          <h3 class="font-semibold leading-none">{t("dashboard.staff.register")}</h3>
          <p class="text-sm text-muted-foreground">{t("dashboard.staff.closePromptDesc")}</p>
        </div>
        <Button
          type="button"
          onclick={() => (showCloseDialog = true)}
          disabled={closing}
          variant="destructive"
          class="w-full"
        >
          <LogOut class="mr-2 h-4 w-4" />
          {closing ? t("dashboard.admin.closing") : t("dashboard.staff.closeRegister")}
        </Button>
      </div>
    </Card>
  </div>

  <Card class="border-border shadow-sm">
    <div class="p-6 pb-0">
      <h3 class="font-semibold">{t("orders.recent")}</h3>
    </div>
    <div class="p-6">
      <RecentOrders limit={5} />
    </div>
  </Card>

  <NewSaleDialog bind:open={showSale} products={productsForSale} onSubmit={createSale} />

  <Dialog bind:open={showCloseDialog}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("dashboard.staff.closePromptTitle")}</DialogTitle>
        <DialogDescription>{t("dashboard.staff.closePromptDesc")}</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="staffName">
            {t("common.name")} <span class="text-destructive">*</span>
          </Label>
          <Input
            id="staffName"
            bind:value={staffName}
            placeholder={t("dashboard.staff.required")}
          />
        </div>
        <div class="grid gap-2">
          <Label for="notes">{t("common.notes")}</Label>
          <Textarea
            id="notes"
            bind:value={notes}
            placeholder={t("dashboard.staff.optional")}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onclick={() => (showCloseDialog = false)}>
          {t("common.cancel")}
        </Button>
        <Button
          onclick={onCloseRegister}
          disabled={closing || !staffName.trim()}
        >
          {t("dashboard.staff.confirmClose")}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</PageContent>
