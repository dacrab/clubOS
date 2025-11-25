<script lang="ts">
import { Calendar, Edit2 } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import DateInput from "$lib/components/ui/date-input.svelte";
import {
	DialogRoot as Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
import { Textarea } from "$lib/components/ui/textarea";
import { facilityState } from "$lib/state/facility.svelte";
import type { TranslationKey } from "$lib/i18n/translations";
import { t } from "$lib/state/i18n.svelte";
import { userState } from "$lib/state/user.svelte";
import { supabase } from "$lib/utils/supabase";
import { formatDateTime } from "$lib/utils/utils";

type AppointmentDB = {
	id: string;
	status: "confirmed" | "cancelled" | "completed";
	appointment_date: string;
	customer_name: string;
	contact_info: string;
	num_children: number;
	num_adults: number;
	notes: string | null;
};

type Appointment = Omit<AppointmentDB, "notes"> & {
	notes: string;
	display_date?: string;
};

let activeTab = $state<"create" | "upcoming">("create");
let list: Appointment[] = $state([]);
let showEdit = $state(false);
let editing: Appointment | null = $state(null);
let editStatus: "confirmed" | "cancelled" | "completed" = $state("confirmed");
let editDate = $state("");
let editTime = $state("");

let form = $state({
	customer_name: "",
	contact_info: "",
	appointment_date: "",
	appointment_time: "",
	num_children: 1,
	num_adults: 0,
	notes: "",
});

$effect(() => {
	userState.load().then(() => {
		load();
	});
});

async function load() {
	const { data: sessionData } = await supabase.auth.getUser();
	const userId = sessionData.user?.id ?? "";

	const { data: memberships } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", userId);

	const tenantId = memberships?.[0]?.tenant_id as string | undefined;
	const facilityId = await facilityState.resolveSelected();

	let query = supabase.from("appointments").select("*").order("appointment_date");
	if (tenantId) query = query.eq("tenant_id", tenantId);
	if (facilityId) query = query.eq("facility_id", facilityId);
	const { data } = await query;

	const rows = (data ?? []) as AppointmentDB[];
	list = rows.map((a) => ({
		...a,
		notes: a.notes ?? "",
		display_date: formatDateTime(a.appointment_date),
	}));
}

async function create() {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;

	const { data: membership } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", user.id);
	const facId = await facilityState.resolveSelected();

	const payload = {
		...form,
		appointment_date: new Date(`${form.appointment_date}T${form.appointment_time || "00:00"}`),
		created_by: user.id,
		tenant_id: membership?.[0]?.tenant_id,
		facility_id: facId,
	};

	const { error } = await supabase.from("appointments").insert(payload);
	if (!error) {
		resetForm();
		load();
	}
}

function resetForm() {
	form = {
		customer_name: "",
		contact_info: "",
		appointment_date: "",
		appointment_time: "",
		num_children: 1,
		num_adults: 0,
		notes: "",
	};
}

function openEdit(appointment: Appointment) {
	editing = { ...appointment, notes: appointment.notes ?? "" };
	const d = new Date(appointment.appointment_date);
	const pad = (n: number) => String(n).padStart(2, "0");

	editDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
	editTime = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
	editStatus = (appointment?.status as typeof editStatus) ?? "confirmed";
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

<PageContent>
  <PageHeader title={t("appointments.title")} subtitle={t("appointments.subtitle")} />

  <Tabs bind:value={activeTab} class="w-full">
    <div class="w-full border-b border-border/60">
      <TabsList class="bg-transparent p-0">
        <TabsTrigger
          value="create"
          class="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
        >
          {t("appointments.tabsCreate")}
        </TabsTrigger>
        <TabsTrigger
          value="upcoming"
          class="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
        >
          {t("appointments.tabsUpcoming")}
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent value="create" class="mt-6">
      <Card class="border-border shadow-sm">
        <div class="p-6 space-y-6">
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="customer_name">{t("common.customerName")}</Label>
                <Input id="customer_name" bind:value={form.customer_name} placeholder={t("common.customerPlaceholder")} />
              </div>
              <div class="space-y-2">
                <Label for="contact_info">{t("common.contactInfo")}</Label>
                <Input id="contact_info" bind:value={form.contact_info} placeholder={t("common.contactPlaceholder")} />
              </div>
              <div class="space-y-2">
                <Label>{t("common.dateTime")}</Label>
                <div class="flex gap-2">
                  <DateInput bind:value={form.appointment_date} placeholder={t("date.placeholder")} class="flex-1" />
                  <Input type="time" bind:value={form.appointment_time} class="w-32" />
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label for="num_children">{t("appointments.children")}</Label>
                  <Input id="num_children" type="number" min="1" bind:value={form.num_children} />
                </div>
                <div class="space-y-2">
                  <Label for="num_adults">{t("appointments.adults")}</Label>
                  <Input id="num_adults" type="number" min="0" bind:value={form.num_adults} />
                </div>
              </div>
              <div class="space-y-2">
                <Label for="notes">{t("common.notes")}</Label>
                <Textarea id="notes" bind:value={form.notes} placeholder={t("common.notesPlaceholder")} class="min-h-[100px]" />
              </div>
              <Button onclick={create} class="w-full">{t("appointments.createButton")}</Button>
            </div>
          </div>
        </div>
      </Card>
    </TabsContent>

    <TabsContent value="upcoming" class="mt-6">
      <Card class="border-border shadow-sm">
        <div class="p-6">
          {#if list.length === 0}
            <div class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Calendar class="size-12 opacity-20 mb-4" />
              <h3 class="text-lg font-medium text-foreground">{t("appointments.emptyTitle")}</h3>
              <p class="text-sm mb-4">{t("appointments.emptySubtitle")}</p>
              <Button variant="outline" onclick={() => (activeTab = "create")}>
                {t("appointments.createCta")}
              </Button>
            </div>
          {:else}
            <div class="space-y-4">
              {#each list as appointment (appointment.id)}
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <h4 class="font-semibold">{appointment.customer_name}</h4>
                      <span class={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        appointment.status === "confirmed" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}>
                        {t(`appointments.status.${appointment.status}` as TranslationKey)}
                      </span>
                    </div>
                    <p class="text-sm text-muted-foreground">
                      {appointment.display_date || formatDateTime(appointment.appointment_date)} • 
                      {appointment.num_children} {t("appointments.children").toLowerCase()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onclick={() => openEdit(appointment)}>
                    <Edit2 class="size-4 mr-2" />
                    {t("common.edit")}
                  </Button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </Card>
    </TabsContent>
  </Tabs>

  <Dialog bind:open={showEdit}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t("appointments.editTitle")}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        {#if editing}
          <div class="grid gap-2">
            <Label>{t("common.status")}</Label>
            <Select bind:value={editStatus} type="single">
              <SelectTrigger>
                {t(`appointments.status.${editStatus}` as TranslationKey)}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed" label={t("appointments.status.confirmed")} />
                <SelectItem value="completed" label={t("appointments.status.completed")} />
                <SelectItem value="cancelled" label={t("appointments.status.cancelled")} />
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>{t("common.customerName")}</Label>
            <Input bind:value={editing.customer_name} />
          </div>
          <div class="grid gap-2">
            <Label>{t("common.dateTime")}</Label>
            <div class="flex gap-2">
              <DateInput bind:value={editDate} class="flex-1" />
              <Input type="time" bind:value={editTime} class="w-32" />
            </div>
          </div>
        {/if}
      </div>
      <DialogFooter>
        <Button variant="ghost" onclick={() => (showEdit = false)}>{t("common.cancel")}</Button>
        <Button onclick={saveEdit}>{t("common.save")}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</PageContent>
