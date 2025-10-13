<script lang="ts">
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import PageContent from "$lib/components/ui/page/page-content.svelte";
import PageHeader from "$lib/components/ui/page/page-header.svelte";
import { t } from "$lib/i18n";
import { loadSettings as loadGlobalSettings } from "$lib/settings";
import { supabase } from "$lib/supabase-client";

((..._args: unknown[]) => {
  return;
})(PageContent, PageHeader, Button, Card, Input, t);

const DEFAULT_LOW_STOCK_THRESHOLD = 3;
let lowStockThreshold = $state<number>(DEFAULT_LOW_STOCK_THRESHOLD);
let saving = $state(false);

$effect(() => {
  loadGlobalSettings();
  loadSettings();
});

async function loadSettings() {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user.id ?? "";
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", uid);
  const tenantId = memberships?.[0]?.tenant_id;
  if (!tenantId) {
    return;
  }
  const { data: row } = await supabase
    .from("tenant_settings")
    .select("id,low_stock_threshold")
    .eq("tenant_id", tenantId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (row) {
    lowStockThreshold = Number(
      (row as { low_stock_threshold?: number })?.low_stock_threshold ??
        DEFAULT_LOW_STOCK_THRESHOLD
    );
  } else {
    lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD;
  }
}

async function save() {
  saving = true;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id ?? "";
    const { data: memberships } = await supabase
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", uid);
    const tenantId = memberships?.[0]?.tenant_id;
    if (!tenantId) {
      return;
    }
    const { error } = await supabase.from("tenant_settings").upsert(
      {
        tenant_id: tenantId,
        low_stock_threshold: Number(lowStockThreshold),
      },
      { onConflict: "tenant_id" }
    );
    if (!error) {
      loadGlobalSettings();
      loadSettings();
    }
  } finally {
    saving = false;
  }
}
// removed capturing IIFE that referenced reactive state; used in markup
</script>

<PageContent>
  <PageHeader title={t("nav.settings")}></PageHeader>

  <div class="grid gap-6 lg:grid-cols-2">
    <Card
      class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 p-6 shadow-sm"
    >
      <h2
        class="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground"
      >
        {t("pages.settings.inventory")}
      </h2>
      <div class="mt-4 flex items-center gap-3">
        <label for="low-stock" class="text-sm text-muted-foreground"
          >{t("pages.settings.lowStockThreshold")}</label
        >
        <Input
          id="low-stock"
          type="number"
          bind:value={lowStockThreshold}
          class="w-24 rounded-lg"
        />
        <Button
          type="button"
          class="rounded-lg"
          onclick={save}
          disabled={saving}
        >
          {t("common.save")}
        </Button>
      </div>
    </Card>
  </div>
</PageContent>
