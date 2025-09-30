<script lang="ts">
import { Dialog as DialogPrimitive } from "bits-ui";
import PageContent from "$lib/components/common/PageContent.svelte";
import PageHeader from "$lib/components/common/PageHeader.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "$lib/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "$lib/components/ui/tabs";
import { Textarea } from "$lib/components/ui/textarea";
import { locale } from "$lib/i18n";

const DialogRoot = DialogPrimitive.Root;

import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "$lib/components/ui/dialog";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";
import { formatDateTime } from "$lib/utils";

type Booking = {
  id: string;
  status: "confirmed" | "cancelled" | "completed";
  field_number: number;
  booking_datetime: string;
  customer_name: string;
  contact_info: string;
  num_players: number;
  notes: string | null;
};

let list: Booking[] = $state([] as Booking[]);
let form = $state({
  customer_name: "",
  contact_info: "",
  booking_date: "",
  booking_time: "",
  field_number: 1,
  num_players: 10,
  notes: "",
});

$effect(() => {
  loadCurrentUser().then(() => {
    const u = $currentUser;
    if (!u) {
      window.location.href = "/login";
      return;
    }
    if (u.role !== "secretary" && u.role !== "admin")
      window.location.href = "/dashboard";
    load();
  });
});

async function load() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id ?? "";
  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", userId);
  const tenantId = memberships?.[0]?.tenant_id;
  const { data } = await supabase
    .from("football_bookings")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("booking_datetime");
  list = ((data as any) ?? []) as Booking[];
}

async function create() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "/login";
    return;
  }
  const payload = {
    customer_name: form.customer_name,
    contact_info: form.contact_info,
    booking_datetime: new Date(
      `${form.booking_date}T${form.booking_time || "00:00"}`
    ),
    field_number: Number(form.field_number || 1),
    num_players: Number(form.num_players || 0),
    notes: form.notes || null,
    created_by: user.id,
    tenant_id: (
      await supabase
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user.id)
    ).data?.[0]?.tenant_id,
  };
  const { error } = await supabase.from("football_bookings").insert(payload);
  if (!error) {
    form = {
      customer_name: "",
      contact_info: "",
      booking_date: "",
      booking_time: "",
      field_number: 1,
      num_players: 10,
      notes: "",
    };
    load();
  }
}

let showEdit = $state(false);
type EditableBooking = Booking & { notes: string };
let editing: EditableBooking | null = $state(null);
let editStatus: "confirmed" | "cancelled" | "completed" = $state("confirmed");
let editDate = $state("");
let editTime = $state("");

function openEdit(b: Booking) {
  editing = { ...b, notes: b.notes ?? "" };
  const d = new Date(b.booking_datetime);
  const pad = (n: number) => String(n).padStart(2, "0");
  editDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  editTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  editStatus = b.status;
  showEdit = true;
}

async function saveEdit() {
  if (!editing) return;
  await supabase
    .from("football_bookings")
    .update({
      status: editStatus,
      customer_name: editing.customer_name,
      contact_info: editing.contact_info,
      booking_datetime: new Date(`${editDate}T${editTime || "00:00"}`),
      field_number: Number(editing.field_number || 1),
      num_players: Number(editing.num_players || 0),
      notes: editing.notes || null,
    })
    .eq("id", editing.id);
  await load();
  showEdit = false;
}
</script>

<PageContent>
  <PageHeader
    title={t("pages.football.title")}
    subtitle={t("pages.football.subtitle")}
  />

  <Tabs value="create" class="w-full">
    <TabsList class="grid w-full max-w-lg grid-cols-2 rounded-2xl border border-outline-soft bg-surface">
      <TabsTrigger value="create" class="rounded-xl">
        {t("pages.football.tabsCreate")}
      </TabsTrigger>
      <TabsTrigger value="upcoming" class="rounded-xl">
        {t("pages.football.tabsUpcoming")}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="create" class="mt-8">
      <Card class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm">
        <div class="flex flex-col gap-6 border-b border-outline-soft/70 p-6">
          <h2 class="text-lg font-semibold text-foreground">
            {t("pages.football.createTitle")}
          </h2>
          <p class="text-sm text-muted-foreground">
            {t("pages.football.subtitle")}
          </p>
        </div>
        <div class="grid gap-6 p-6 md:grid-cols-2">
            <div class="flex flex-col gap-4">
              <label class="flex flex-col gap-2 text-sm text-muted-foreground">
                <span class="font-medium text-foreground">{t("pages.football.customerName")}</span>
                <Input
                  bind:value={form.customer_name}
                class="rounded-lg border-outline-soft bg-background"
                />
              </label>
              <label class="flex flex-col gap-2 text-sm text-muted-foreground">
                <span class="font-medium text-foreground">{t("pages.football.contactInfo")}</span>
                <Input
                  placeholder={t("pages.football.contactPlaceholder")}
                  bind:value={form.contact_info}
                class="rounded-lg border-outline-soft bg-background"
                />
              </label>
            <label class="flex flex-col gap-2 text-sm text-muted-foreground">
              <span class="font-medium text-foreground">{t("pages.football.dateTime")}</span>
              <div class="grid grid-cols-[1fr_auto] items-center gap-2">
                <Input type="date" bind:value={form.booking_date} aria-label={t("pages.football.dateTime")} class="w-44 rounded-xl border-outline-soft bg-background" lang={$locale === 'el' ? 'el-GR' : 'en-GB'} />
                <Input
                  type="time"
                  bind:value={form.booking_time}
                  class="w-28 rounded-xl border-outline-soft bg-background"
                />
              </div>
            </label>
          </div>

          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4">
              <label class="flex flex-col gap-2 text-sm text-muted-foreground">
                <span class="font-medium text-foreground">{t("pages.football.field")}</span>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  bind:value={form.field_number}
                  class="rounded-xl border-outline-soft bg-background"
                />
              </label>
              <label class="flex flex-col gap-2 text-sm text-muted-foreground">
                <span class="font-medium text-foreground">{t("pages.football.players")}</span>
                <Input
                  type="number"
                  min="2"
                  max="12"
                  bind:value={form.num_players}
                  class="rounded-xl border-outline-soft bg-background"
                />
              </label>
            </div>
            <label class="flex flex-col gap-2 text-sm text-muted-foreground">
              <span class="font-medium text-foreground">{t("pages.football.notes")}</span>
              <Textarea
                placeholder={t("pages.football.notesPlaceholder")}
                bind:value={form.notes}
                class="min-h-24 rounded-lg border-outline-soft bg-background"
              />
            </label>
            <Button
              type="button"
              onclick={create}
              class="h-12 rounded-lg text-sm font-semibold"
            >
              {t("pages.football.createButton")}
            </Button>
          </div>
        </div>
      </Card>
    </TabsContent>

    <TabsContent value="upcoming" class="mt-8">
      <Card class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm">
        <div class="flex flex-col gap-6 border-b border-outline-soft/70 p-6">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-foreground">
                {t("pages.football.upcomingTitle")}
              </h2>
              <p class="text-sm text-muted-foreground">
                {t("pages.football.manageExisting")}
              </p>
            </div>
          </div>
        </div>
        <div class="p-6">
          {#if list.length === 0}
            <div class="grid place-items-center gap-4 rounded-2xl border border-dashed border-outline-soft/70 bg-surface-strong/40 px-8 py-16 text-center text-sm text-muted-foreground">
              {t("pages.football.none")}
            </div>
          {:else}
            <div class="flex flex-col gap-4">
              {#each list as booking}
                <div class="flex items-center justify-between gap-4 rounded-2xl border border-outline-soft bg-surface px-4 py-4 text-sm text-muted-foreground transition-all hover:border-outline-strong hover:bg-surface-strong/60">
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-foreground">{booking.customer_name}</div>
                    <div class="mt-1 flex flex-wrap items-center gap-3 text-xs">
                      <span>{formatDateTime(booking.booking_datetime)}</span>
                      <span>
                        {t("pages.football.fieldLabel")}
                        {" "}
                        {booking.field_number}
                      </span>
                      <span>{booking.num_players} {t("pages.football.players").toLowerCase()}</span>
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">{booking.contact_info}</div>
                    {#if booking.notes}
                      <div class="mt-2 text-xs italic text-muted-foreground">
                        "{booking.notes}"
                      </div>
                    {/if}
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      class={`rounded-lg px-3 py-1 text-xs font-medium capitalize ${booking.status === 'confirmed' ? 'bg-green-500/10 text-green-700 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}
                    >
                      {t(`pages.football.status.${booking.status}` as any)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="rounded-lg"
                      onclick={() => openEdit(booking)}
                    >
                      {t("common.edit")}
                    </Button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </Card>
    </TabsContent>
  </Tabs>
</PageContent>


<DialogRoot bind:open={showEdit}>
  <DialogContent class="sm:max-w-[520px] rounded-2xl border border-outline-soft/70 bg-surface-soft/90 shadow-xl">
    <DialogHeader>
      <DialogTitle>{t('pages.football.editTitle')}</DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-2">
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">{t('common.status')}</Label>
        <div class="col-span-3">
          <Select bind:value={editStatus} type="single">
            <SelectTrigger class="w-full">
              <span data-slot="select-value" class="truncate">{t(`pages.football.status.${editStatus}` as any)}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed" label={t('pages.football.status.confirmed')} />
              <SelectItem value="completed" label={t('pages.football.status.completed')} />
              <SelectItem value="cancelled" label={t('pages.football.status.cancelled')} />
            </SelectContent>
          </Select>
        </div>
      </div>
      {#if editing}
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.football.customerName')}</Label>
          <Input class="col-span-3" bind:value={editing.customer_name} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.football.contactInfo')}</Label>
          <Input class="col-span-3" bind:value={editing.contact_info} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.football.dateTime')}</Label>
          <div class="col-span-3 grid grid-cols-[1fr_auto] gap-2 items-center">
            <Input type="date" bind:value={editDate} aria-label={t('pages.football.dateTime')} class="w-44" lang={$locale === 'el' ? 'el-GR' : 'en-GB'} />
            <Input class="w-28" type="time" bind:value={editTime} />
          </div>
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.football.field')}</Label>
          <Input class="col-span-3 w-40" type="number" min="1" max="5" bind:value={editing.field_number} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.football.players')}</Label>
          <Input class="col-span-3 w-40" type="number" min="2" max="12" bind:value={editing.num_players} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.football.notes')}</Label>
          <Textarea class="col-span-3 min-h-20" bind:value={editing.notes} />
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button variant="outline" onclick={() => (showEdit = false)}>{t('common.cancel')}</Button>
      <Button onclick={saveEdit}>{t('common.save')}</Button>
    </DialogFooter>
  </DialogContent>
</DialogRoot>