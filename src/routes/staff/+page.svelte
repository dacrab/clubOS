<script lang="ts">
import { LogOut, ShoppingCart } from "@lucide/svelte";
import { get } from "svelte/store";
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import PageContent from "$lib/components/ui/page/page-content.svelte";
import PageHeader from "$lib/components/ui/page/page-header.svelte";
import { t } from "$lib/i18n";
import { closeRegister, ensureOpenSession } from "$lib/register";
import { supabase } from "$lib/supabase-client";
import { currentUser, loadCurrentUser } from "$lib/user";

let closing = $state(false);
let showCloseDialog = $state(false);
let staffName = $state("");
let notes = $state("");
let finalCash = $state("");

$effect(() => {
  loadCurrentUser().then(() => {
    const user = get(currentUser);
    if (!user) {
      window.location.href = "/login";
      return;
    }
    if (user.role !== "staff") {
      window.location.href = "/dashboard";
    }
  });
});

async function onCloseRegister() {
  if (!staffName.trim()) {
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "/login";
    return;
  }

  const sessionId = await ensureOpenSession(supabase, user.id);
  closing = true;

  try {
    await closeRegister(supabase, sessionId, {
      staff_name: staffName,
      notes,
      final_cash: Number(finalCash || 0),
    });

    showCloseDialog = false;
    staffName = "";
    notes = "";
    finalCash = "";
  } finally {
    closing = false;
  }
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
            <span
              class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
            >
              {t("dashboard.staff.pos")}
            </span>
            <p class="text-sm text-muted-foreground">
              {t("dashboard.staff.posDesc")}
            </p>
          </div>
        </div>
        <Button
          href="/orders"
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
          <span
            class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground"
          >
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
            <span class="font-medium text-foreground">{t("common.name")}</span>
            <input
              id="staffName"
              class="w-full rounded-lg border border-outline-soft/70 bg-background px-3 py-2"
              bind:value={staffName}
              placeholder={t("dashboard.staff.required")}
            />
          </label>

          <label
            class="flex flex-col gap-2 text-sm text-muted-foreground"
            for="finalCash"
          >
            <span class="font-medium text-foreground">Final cash (€)</span>
            <input
              id="finalCash"
              class="w-full rounded-lg border border-outline-soft/70 bg-background px-3 py-2"
              type="number"
              step="0.01"
              min="0"
              bind:value={finalCash}
              placeholder="0.00"
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
            disabled={closing || !staffName.trim() || finalCash === ""}
          >
            {t("dashboard.staff.confirmClose")}
          </Button>
        </div>
      </div>
    </div>
  {/if}
</PageContent>
