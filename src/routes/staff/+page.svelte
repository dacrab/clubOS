<script lang="ts">
import { LogOut, ShoppingCart } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "$lib/components/ui/card";
import { t } from "$lib/i18n";
import { closeRegister, ensureOpenSession } from "$lib/register";
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";

let closing = $state(false);
let showCloseDialog = $state(false);
let staffName = $state("");
let notes = $state("");
let finalCash = $state("");

$effect(() => {
  loadCurrentUser().then(() => {
    const u = $currentUser;
    if (!u) {
      window.location.href = "/login";
      return;
    }
    if (u.role !== "staff") window.location.href = "/dashboard";
  });
});

async function onCloseRegister() {
  if (!staffName.trim()) return;
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

<section class="space-y-8">
  <div class="text-center space-y-4 pb-2">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 mb-4">
      <ShoppingCart class="w-8 h-8 text-blue-600 dark:text-blue-400" />
    </div>
    <div>
      <h1 class="text-3xl font-bold gradient-text mb-2">{t('dashboard.staff.title')}</h1>
      <p class="text-muted-foreground text-lg">{t('dashboard.staff.quickActions')}</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card class="card-hover bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader class="pb-4">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <ShoppingCart class="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle class="text-xl">{t('dashboard.staff.pos')}</CardTitle>
            <p class="text-sm text-muted-foreground">{t('dashboard.staff.posDesc')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent class="pt-0">
        <Button href="/orders" size="lg" class="w-full h-14 rounded-xl text-base font-medium">
          <ShoppingCart class="mr-3 h-5 w-5" />
          {t('orders.new')}
        </Button>
      </CardContent>
    </Card>

    <Card class="card-hover">
      <CardHeader class="pb-4">
        <CardTitle class="text-xl">{t('dashboard.staff.register')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4 pt-0">
        <Button
          onclick={() => (showCloseDialog = true)}
          disabled={closing}
          variant="destructive"
          class="w-full h-12 rounded-lg"
          type="button"
        >
          <LogOut class="mr-2 h-4 w-4" />
          {closing ? t('dashboard.admin.closing') : t('dashboard.staff.closeRegister')}
        </Button>
      </CardContent>
    </Card>
  </div>

  {#if showCloseDialog}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="bg-card rounded-lg border w-full max-w-md p-4 shadow-lg">
        <h2 class="text-lg font-semibold mb-2">{t('dashboard.staff.closePromptTitle')}</h2>
        <p class="text-sm text-muted-foreground mb-4">{t('dashboard.staff.closePromptDesc')}</p>
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1" for="staffName">{t('common.name')}</label>
            <input id="staffName" class="w-full border rounded px-3 py-2 bg-background" bind:value={staffName} placeholder={t('dashboard.staff.required')} />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" for="finalCash">Final cash (€)</label>
            <input id="finalCash" class="w-full border rounded px-3 py-2 bg-background" type="number" step="0.01" min="0" bind:value={finalCash} placeholder="0.00" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1" for="notes">{t('common.notes')}</label>
            <textarea id="notes" class="w-full border rounded px-3 py-2 min-h-24 bg-background" bind:value={notes} placeholder={t('dashboard.staff.optional')}></textarea>
          </div>
          <div class="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onclick={() => (showCloseDialog = false)}>{t('common.cancel')}</Button>
            <Button type="button" onclick={onCloseRegister} disabled={closing || !staffName.trim() || finalCash === ""}>{t('dashboard.staff.confirmClose')}</Button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</section>


