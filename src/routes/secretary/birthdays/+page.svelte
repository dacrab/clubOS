<script lang="ts">
import { ClipboardList } from "@lucide/svelte";
import { get } from "svelte/store";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { DateInput } from "$lib/components/ui/date-input";
import {
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogRoot,
	DialogTitle,
} from "$lib/components/ui/dialog";
import { Input } from "$lib/components/ui/input";
import { PageContent, PageHeader } from "$lib/components/ui/page";
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
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabase-client";
import { currentUser, loadCurrentUser } from "$lib/user";
import { formatDateTime } from "$lib/utils";

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
	loadCurrentUser().then(() => {
		const u = get(currentUser);
		if (!u) {
			window.location.href = "/login";
			return;
		}
		if (u.role !== "secretary" && u.role !== "admin") {
			window.location.href = "/dashboard";
		}
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
		.from("appointments")
		.select("*")
		.eq("tenant_id", tenantId)
		.order("appointment_date");

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
	if (!user) {
		window.location.href = "/login";
		return;
	}

	const { data: membership } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", user.id);

	const payload = {
		...form,
		appointment_date: new Date(
			`${form.appointment_date}T${form.appointment_time || "00:00"}`,
		),
		created_by: user.id,
		tenant_id: membership?.[0]?.tenant_id,
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
	if (!editing) {
		return;
	}

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
  <PageHeader
    title={t("pages.appointments.title")}
    subtitle={t("pages.appointments.subtitle")}
    icon={ClipboardList}
  />

  <Tabs bind:value={activeTab} class="w-full">
    <TabsList
      class="grid w-full max-w-lg grid-cols-2 rounded-2xl border border-outline-soft bg-surface"
    >
      <TabsTrigger value="create" class="rounded-xl">
        {t("pages.appointments.tabsCreate")}
      </TabsTrigger>
      <TabsTrigger value="upcoming" class="rounded-xl">
        {t("pages.appointments.tabsUpcoming")}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="create" class="mt-8">
      <Card
        class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
      >
        <div class="flex flex-col gap-6 border-b border-outline-soft/70 p-6">
          <h2 class="text-lg font-semibold text-foreground">
            {t("pages.appointments.createTitle")}
          </h2>
          <p class="text-sm text-muted-foreground">
            {t("pages.appointments.createSubtitle")}
          </p>
        </div>

        <div class="grid gap-6 p-6 md:grid-cols-2">
          <div class="flex flex-col gap-4">
            <label class="flex flex-col gap-2 text-sm text-muted-foreground">
              <span class="font-medium text-foreground">
                {t("pages.appointments.customerName")}
              </span>
              <Input
                placeholder={t("pages.appointments.customerPlaceholder")}
                bind:value={form.customer_name}
                class="rounded-lg border-outline-soft bg-background"
              />
            </label>

            <label class="flex flex-col gap-2 text-sm text-muted-foreground">
              <span class="font-medium text-foreground">
                {t("pages.appointments.contactInfo")}
              </span>
              <Input
                placeholder={t("pages.appointments.contactPlaceholder")}
                bind:value={form.contact_info}
                class="rounded-lg border-outline-soft bg-background"
              />
            </label>

            <label class="flex flex-col gap-2 text-sm text-muted-foreground">
              <span class="font-medium text-foreground">
                {t("pages.appointments.dateTime")}
              </span>
              <div class="grid grid-cols-[1fr_auto] items-center gap-2">
                <DateInput
                  bind:value={form.appointment_date}
                  placeholder={t("date.placeholder")}
                />
                <Input
                  type="time"
                  bind:value={form.appointment_time}
                  class="w-28 rounded-xl border-outline-soft bg-background"
                />
              </div>
            </label>
          </div>

          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-2 gap-4">
              <label class="flex flex-col gap-2 text-sm text-muted-foreground">
                <span class="font-medium text-foreground">
                  {t("pages.appointments.children")}
                </span>
                <Input
                  type="number"
                  min="1"
                  bind:value={form.num_children}
                  class="rounded-xl border-outline-soft bg-background"
                />
              </label>

              <label class="flex flex-col gap-2 text-sm text-muted-foreground">
                <span class="font-medium text-foreground">
                  {t("pages.appointments.adults")}
                </span>
                <Input
                  type="number"
                  min="0"
                  bind:value={form.num_adults}
                  class="rounded-xl border-outline-soft bg-background"
                />
              </label>
            </div>

            <label class="flex flex-col gap-2 text-sm text-muted-foreground">
              <span class="font-medium text-foreground">
                {t("pages.appointments.notes")}
              </span>
              <Textarea
                placeholder={t("pages.appointments.notesPlaceholder")}
                bind:value={form.notes}
                class="min-h-24 rounded-lg border-outline-soft bg-background"
              />
            </label>

            <Button
              type="button"
              onclick={create}
              class="h-12 rounded-lg text-sm font-semibold"
            >
              <ClipboardList class="mr-2 h-4 w-4" />
              {t("pages.appointments.createButton")}
            </Button>
          </div>
        </div>
      </Card>
    </TabsContent>

    <TabsContent value="upcoming" class="mt-8">
      <Card
        class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm"
      >
        <div class="flex flex-col gap-6 border-b border-outline-soft/70 p-6">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-foreground">
                {t("pages.appointments.allAppointments")}
              </h2>
              <p class="text-sm text-muted-foreground">
                {t("pages.appointments.manageExisting")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="rounded-lg"
            >
              {t("pages.appointments.exportList")}
            </Button>
          </div>
        </div>

        <div class="p-6">
          {#if list.length === 0}
            <div
              class="grid place-items-center gap-4 rounded-2xl border border-dashed border-outline-soft/70 bg-surface-strong/40 px-8 py-16 text-center"
            >
              <ClipboardList class="size-12 text-muted-foreground" />
              <div class="space-y-2">
                <h3 class="text-base font-semibold text-foreground">
                  {t("pages.appointments.emptyTitle")}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {t("pages.appointments.emptySubtitle")}
                </p>
              </div>
              <Button
                type="button"
                class="rounded-lg"
                onclick={() => (activeTab = "create")}
              >
                {t("pages.appointments.createCta")}
              </Button>
            </div>
          {:else}
            <div class="flex flex-col gap-4">
              {#each list as appointment}
                <div
                  class="flex items-center justify-between gap-4 rounded-2xl border border-outline-soft bg-surface px-4 py-4 transition-all hover:border-outline-strong hover:bg-surface-strong/60"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-3">
                      <span
                        class="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                      >
                        {appointment.customer_name?.slice(0, 1) ?? "?"}
                      </span>
                      <div class="flex flex-col">
                        <span class="font-semibold text-foreground">
                          {appointment.customer_name}
                        </span>
                        <span class="text-sm text-muted-foreground">
                          {appointment.contact_info}
                        </span>
                      </div>
                    </div>

                    <div
                      class="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
                    >
                      <span>
                        {appointment.display_date ||
                          formatDateTime(appointment.appointment_date)}
                      </span>
                      <span>
                        {appointment.num_children}
                        {t("pages.appointments.children").toLowerCase()}
                      </span>
                      <span>
                        {appointment.num_adults}
                        {t("pages.appointments.adults").toLowerCase()}
                      </span>
                    </div>

                    {#if appointment.notes}
                      <p class="mt-2 text-xs italic text-muted-foreground">
                        "{appointment.notes}"
                      </p>
                    {/if}
                  </div>

                  <div class="flex items-center gap-2">
                    <span
                      class={`rounded-lg px-3 py-1 text-xs font-medium capitalize ${
                        appointment.status === "confirmed"
                          ? "bg-green-500/10 text-green-700 dark:text-green-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t(
                        `pages.appointments.status.${appointment.status}` as any,
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="rounded-lg"
                      onclick={() => openEdit(appointment)}
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
  <DialogContent
    class="sm:max-w-[520px] rounded-2xl border border-outline-soft/70 bg-surface-soft/90 shadow-xl"
  >
    <DialogHeader>
      <DialogTitle class="text-lg font-semibold text-foreground">
        {t("pages.appointments.editTitle")}
      </DialogTitle>
    </DialogHeader>

    <div class="grid gap-4 py-4">
      <label
        class="grid grid-cols-4 items-center gap-3 text-sm text-muted-foreground"
      >
        <span class="text-right font-medium text-foreground">
          {t("common.status")}
        </span>
        <div class="col-span-3">
          <Select bind:value={editStatus} type="single">
            <SelectTrigger
              class="w-full rounded-xl border-outline-soft bg-background"
            >
              <span data-slot="select-value" class="truncate">
                {t(`pages.appointments.status.${editStatus}` as any)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="confirmed"
                label={t("pages.appointments.status.confirmed")}
              />
              <SelectItem
                value="completed"
                label={t("pages.appointments.status.completed")}
              />
              <SelectItem
                value="cancelled"
                label={t("pages.appointments.status.cancelled")}
              />
            </SelectContent>
          </Select>
        </div>
      </label>

      {#if editing}
        <label
          class="grid grid-cols-4 items-center gap-3 text-sm text-muted-foreground"
        >
          <span class="text-right font-medium text-foreground">
            {t("pages.appointments.customerName")}
          </span>
          <Input
            class="col-span-3 rounded-xl border-outline-soft bg-background"
            bind:value={editing.customer_name}
          />
        </label>

        <label
          class="grid grid-cols-4 items-center gap-3 text-sm text-muted-foreground"
        >
          <span class="text-right font-medium text-foreground">
            {t("pages.appointments.contactInfo")}
          </span>
          <Input
            class="col-span-3 rounded-xl border-outline-soft bg-background"
            bind:value={editing.contact_info}
          />
        </label>

        <label
          class="grid grid-cols-4 items-center gap-3 text-sm text-muted-foreground"
        >
          <span class="text-right font-medium text-foreground">
            {t("pages.appointments.dateTime")}
          </span>
          <div class="col-span-3 grid grid-cols-[1fr_auto] items-center gap-2">
            <DateInput
              bind:value={editDate}
              placeholder={t("date.placeholder")}
            />
            <Input
              class="w-28 rounded-xl border-outline-soft bg-background"
              type="time"
              bind:value={editTime}
            />
          </div>
        </label>

        <label
          class="grid grid-cols-4 items-center gap-3 text-sm text-muted-foreground"
        >
          <span class="text-right font-medium text-foreground">
            {t("pages.appointments.children")}
          </span>
          <Input
            class="col-span-3 w-40 rounded-xl border-outline-soft bg-background"
            type="number"
            min="1"
            bind:value={editing.num_children}
          />
        </label>

        <label
          class="grid grid-cols-4 items-center gap-3 text-sm text-muted-foreground"
        >
          <span class="text-right font-medium text-foreground">
            {t("pages.appointments.adults")}
          </span>
          <Input
            class="col-span-3 w-40 rounded-xl border-outline-soft bg-background"
            type="number"
            min="0"
            bind:value={editing.num_adults}
          />
        </label>

        <label
          class="grid grid-cols-4 items-center gap-3 text-sm text-muted-foreground"
        >
          <span class="text-right font-medium text-foreground">
            {t("pages.appointments.notes")}
          </span>
          <Textarea
            class="col-span-3 min-h-24 rounded-xl border-outline-soft bg-background"
            bind:value={editing.notes}
          />
        </label>
      {/if}
    </div>

    <DialogFooter class="flex gap-2">
      <Button
        type="button"
        variant="outline"
        class="rounded-full"
        onclick={() => (showEdit = false)}
      >
        {t("common.cancel")}
      </Button>
      <Button type="button" class="rounded-full" onclick={saveEdit}>
        {t("common.save")}
      </Button>
    </DialogFooter>
  </DialogContent>
</DialogRoot>
