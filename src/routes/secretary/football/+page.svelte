<script lang="ts">
import { supabase } from "$lib/supabaseClient";
import { formatDateTime } from "$lib/utils";
import { currentUser, loadCurrentUser } from "$lib/user";
import { t } from "$lib/i18n";

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

import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { Textarea } from "$lib/components/ui/textarea";
import { DatePicker } from "$lib/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
import { Dialog as DialogPrimitive } from "bits-ui";
const DialogRoot = DialogPrimitive.Root;
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";

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
  const { data } = await supabase
    .from("football_bookings")
    .select("*")
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
    booking_datetime: new Date(`${form.booking_date}T${form.booking_time || "00:00"}`),
    field_number: Number(form.field_number || 1),
    num_players: Number(form.num_players || 0),
    notes: form.notes || null,
    created_by: user.id,
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

<section class="space-y-8">
  <div class="text-center space-y-4 pb-2">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 mb-4">
      <span class="text-2xl">⚽</span>
    </div>
    <div>
      <h1 class="text-3xl font-bold gradient-text mb-2">{t('pages.football.title')}</h1>
      <p class="text-muted-foreground text-lg">{t('pages.football.subtitle')}</p>
    </div>
  </div>

  <Tabs value="create" class="w-full">
    <TabsList class="grid w-full grid-cols-2 lg:w-96">
      <TabsTrigger value="create" class="rounded-lg">{t('pages.football.tabsCreate')}</TabsTrigger>
      <TabsTrigger value="upcoming" class="rounded-lg">{t('pages.football.tabsUpcoming')}</TabsTrigger>
    </TabsList>

    <TabsContent value="create" class="mt-8">
      <Card class="card-hover">
        <CardHeader class="pb-6">
          <CardTitle class="text-xl">{t('pages.football.createTitle')}</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">{t('pages.football.subtitle')}</p>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div class="space-y-2">
                <Label class="text-sm font-medium">{t('pages.football.customerName')}</Label>
                <Input bind:value={form.customer_name} class="h-11" />
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">{t('pages.football.contactInfo')}</Label>
                <Input placeholder={t('pages.football.contactPlaceholder')} bind:value={form.contact_info} class="h-11" />
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">{t('pages.football.dateTime')}</Label>
                <div class="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <DatePicker bind:value={form.booking_date} ariaLabel={t('pages.football.dateTime')} />
                  <Input type="time" bind:value={form.booking_time} class="h-11 w-28" />
                </div>
              </div>
            </div>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label class="text-sm font-medium">{t('pages.football.field')}</Label>
                  <Input type="number" min="1" max="5" bind:value={form.field_number} class="h-11" />
                </div>
                <div class="space-y-2">
                  <Label class="text-sm font-medium">{t('pages.football.players')}</Label>
                  <Input type="number" min="2" max="12" bind:value={form.num_players} class="h-11" />
                </div>
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">{t('pages.football.notes')}</Label>
                <Textarea placeholder={t('pages.football.notesPlaceholder')} bind:value={form.notes} class="min-h-20" />
              </div>
              <Button onclick={create} size="lg" class="w-full h-12 rounded-xl">
                {t('pages.football.createButton')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="upcoming" class="mt-8">
      <Card class="card-hover">
        <CardHeader class="pb-6">
          <CardTitle class="text-xl">{t('pages.football.upcomingTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {#if list.length === 0}
            <div class="text-center py-10 text-muted-foreground">{t('pages.football.none')}</div>
          {:else}
            <div class="space-y-4">
              {#each list as b}
                <div class="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div class="flex-1 min-w-0 text-sm text-muted-foreground">
                    <div class="font-medium text-foreground">{b.customer_name}</div>
                    <div>{formatDateTime(b.booking_datetime)} • {t('pages.football.fieldLabel')} {b.field_number} • {b.num_players} {t('pages.football.players').toLowerCase()}</div>
                    <div>{b.contact_info}</div>
                    {#if b.notes}
                      <div class="italic mt-1">"{b.notes}"</div>
                    {/if}
                  </div>
                  <div class="flex items-center gap-2 ml-4">
                    <span class={`px-3 py-1 rounded-full text-xs capitalize ${b.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-muted'}`}>{t(`pages.football.status.${b.status}` as any)}</span>
                    <Button variant="outline" size="sm" class="h-8 px-2" onclick={() => openEdit(b)}>{t('common.edit')}</Button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
</section>


<DialogRoot bind:open={showEdit}>
  <DialogContent class="sm:max-w-[520px]">
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
            <DatePicker bind:value={editDate} ariaLabel={t('pages.football.dateTime')} />
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