<script lang="ts">
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";
import { t } from "$lib/i18n";
import { formatDateTime } from "$lib/utils";

let list: Array<any> = $state([]);
let form = $state({
  customer_name: "",
  contact_info: "",
  appointment_date: "",
  appointment_time: "",
  num_children: 1,
  num_adults: 0,
  notes: "",
});

import { ClipboardList } from "@lucide/svelte";
// import { toast } from "svelte-sonner";
import { Button } from "$lib/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { Dialog as DialogPrimitive } from "bits-ui";
const DialogRoot = DialogPrimitive.Root;
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "$lib/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "$lib/components/ui/tabs";
import { Textarea } from "$lib/components/ui/textarea";
import { DatePicker } from "$lib/components/ui/date-picker";

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
    .from("appointments")
    .select("*")
    .order("appointment_date");
  list = ((data as any) ?? []).map((a: any) => ({
    ...a,
    display_date: formatDateTime(a.appointment_date),
  }));
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
    ...form,
    appointment_date: new Date(`${form.appointment_date}T${form.appointment_time || "00:00"}`),
    created_by: user.id,
  };
  const { error } = await supabase.from("appointments").insert(payload);
  if (!error) {
    form = {
      customer_name: "",
      contact_info: "",
      appointment_date: "",
      appointment_time: "",
      num_children: 1,
      num_adults: 0,
      notes: "",
    } as any;
    load();
  }
}

// status update handled inside saveEdit

// const PHONE_RE = /^\+?\d[\d\s()-]{5,}$/;
// const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

let showEdit = $state(false);
let editing: any | null = $state(null);
let editStatus: "confirmed" | "cancelled" | "completed" = $state("confirmed");
let editDate = $state("");
let editTime = $state("");
function openEdit(a: any) {
  editing = { ...a };
  const d = new Date(a.appointment_date);
  const pad = (n: number) => String(n).padStart(2, "0");
  editDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  editTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  editStatus = (a?.status as typeof editStatus) ?? "confirmed";
  showEdit = true;
}
async function saveEdit() {
  if (!editing) return;
  await supabase
    .from("appointments")
    .update({
      status: editStatus,
      customer_name: editing.customer_name,
      contact_info: editing.contact_info,
      appointment_date: new Date(`${editDate}T${editTime || "00:00"}`),
      num_children: Number(editing.num_children ?? 0),
      num_adults: Number(editing.num_adults ?? 0),
      notes: editing.notes ?? null,
    })
    .eq("id", editing.id);
  await load();
  showEdit = false;
}
</script>

<section class="space-y-8">
  <!-- Header -->
  <div class="text-center space-y-4 pb-2">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 mb-4">
      <ClipboardList class="w-8 h-8 text-purple-600 dark:text-purple-400" />
    </div>
    <div>
      <h1 class="text-3xl font-bold gradient-text mb-2">{t('pages.appointments.title')}</h1>
      <p class="text-muted-foreground text-lg">{t('pages.appointments.subtitle')}</p>
    </div>
  </div>

  <!-- Main Content -->
  <Tabs value="create" class="w-full">
      <TabsList class="grid w-full grid-cols-2 lg:w-96">
        <TabsTrigger value="create" class="rounded-lg">{t('pages.appointments.tabsCreate')}</TabsTrigger>
        <TabsTrigger value="upcoming" class="rounded-lg">{t('pages.appointments.tabsUpcoming')}</TabsTrigger>
    </TabsList>

    <TabsContent value="create" class="mt-8">
      <Card class="card-hover">
        <CardHeader class="pb-6">
          <CardTitle class="text-xl">{t('pages.appointments.createTitle')}</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">{t('pages.appointments.createSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div class="space-y-2">
                <Label class="text-sm font-medium">{t('pages.appointments.customerName')}</Label>
                <Input
                  placeholder={t('pages.appointments.customerPlaceholder')}
                  bind:value={form.customer_name}
                  class="h-11"
                />
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">{t('pages.appointments.contactInfo')}</Label>
                <Input
                  placeholder={t('pages.appointments.contactPlaceholder')}
                  bind:value={form.contact_info}
                  class="h-11"
                />
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">{t('pages.appointments.dateTime')}</Label>
                <div class="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <DatePicker bind:value={form.appointment_date} showTime={false} ariaLabel={t('pages.appointments.dateTime')} />
                  <Input type="time" bind:value={form.appointment_time} class="h-11 w-28" />
                </div>
              </div>
            </div>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label class="text-sm font-medium">{t('pages.appointments.children')}</Label>
                  <Input
                    type="number"
                    min="1"
                    bind:value={form.num_children}
                    class="h-11"
                  />
                </div>
                <div class="space-y-2">
                  <Label class="text-sm font-medium">{t('pages.appointments.adults')}</Label>
                  <Input
                    type="number"
                    min="0"
                    bind:value={form.num_adults}
                    class="h-11"
                  />
                </div>
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">{t('pages.appointments.notes')}</Label>
                <Textarea
                  placeholder={t('pages.appointments.notesPlaceholder')}
                  bind:value={form.notes}
                  class="min-h-20"
                />
              </div>
              <Button onclick={create} size="lg" class="w-full h-12 rounded-xl">
                <ClipboardList class="mr-2 h-4 w-4" />
                {t('pages.appointments.createButton')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="upcoming" class="mt-8">
      <Card class="card-hover">
        <CardHeader class="pb-6">
          <div class="flex items-center justify-between">
            <div>
              <CardTitle class="text-xl">{t('pages.appointments.allAppointments')}</CardTitle>
              <p class="text-sm text-muted-foreground mt-1">{t('pages.appointments.manageExisting')}</p>
            </div>
            <Button variant="outline" size="sm">
              {t('pages.appointments.exportList')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {#if list.length === 0}
            <div class="text-center py-12">
              <ClipboardList class="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 class="text-lg font-semibold mb-2">{t('pages.appointments.emptyTitle')}</h3>
              <p class="text-muted-foreground mb-4">{t('pages.appointments.emptySubtitle')}</p>
              <Button onclick={() => {
                const createTab = document.querySelector('[value="create"]') as HTMLElement;
                createTab?.click();
              }}>
                {t('pages.appointments.createCta')}
              </Button>
            </div>
          {:else}
            <div class="space-y-4">
              {#each list as a}
                <div class="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-2">
                      <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span class="text-primary font-semibold">{a.customer_name.charAt(0)}</span>
                      </div>
                      <div>
                        <h4 class="font-semibold">{a.customer_name}</h4>
                        <p class="text-sm text-muted-foreground">{a.contact_info}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{a.display_date || formatDateTime(a.appointment_date)}</span>
                      <span>{a.num_children} {t('pages.appointments.children').toLowerCase()}, {a.num_adults} {t('pages.appointments.adults').toLowerCase()}</span>
                    </div>
                    {#if a.notes}
                      <p class="text-sm text-muted-foreground mt-2 italic">"{a.notes}"</p>
                    {/if}
                  </div>
                  <div class="flex items-center gap-2 ml-4">
                    <span class={`px-3 py-1 rounded-full text-xs capitalize ${a.status === 'confirmed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-muted'}`}>{t(`pages.appointments.status.${a.status}` as any)}</span>
                    <Button variant="outline" size="sm" class="h-8 px-2" onclick={() => openEdit(a)}>
                      {t('common.edit')}
                    </Button>
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
      <DialogTitle>{t('pages.appointments.editTitle')}</DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-2">
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">{t('common.status')}</Label>
        <div class="col-span-3">
          <Select bind:value={editStatus} type="single">
            <SelectTrigger class="w-full">
              <span data-slot="select-value" class="truncate">
                {t(`pages.appointments.status.${editStatus}` as any)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed" label={t('pages.appointments.status.confirmed')} />
              <SelectItem value="completed" label={t('pages.appointments.status.completed')} />
              <SelectItem value="cancelled" label={t('pages.appointments.status.cancelled')} />
            </SelectContent>
          </Select>
        </div>
      </div>
      {#if editing}
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.appointments.customerName')}</Label>
          <Input class="col-span-3" bind:value={editing.customer_name} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.appointments.contactInfo')}</Label>
          <Input class="col-span-3" bind:value={editing.contact_info} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.appointments.dateTime')}</Label>
          <div class="col-span-3 grid grid-cols-[1fr_auto] gap-2 items-center">
            <DatePicker bind:value={editDate} ariaLabel={t('pages.appointments.dateTime')} />
            <Input class="w-28" type="time" bind:value={editTime} />
          </div>
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.appointments.children')}</Label>
          <Input class="col-span-3 w-40" type="number" min="1" bind:value={editing.num_children} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.appointments.adults')}</Label>
          <Input class="col-span-3 w-40" type="number" min="0" bind:value={editing.num_adults} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t('pages.appointments.notes')}</Label>
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