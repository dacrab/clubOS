<script lang="ts">
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
import { Label } from "$lib/components/ui/label";
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
import { resolveSelectedFacilityId } from "$lib/facility";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabase-client";
import { loadCurrentUser } from "$lib/user";
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

	const tenantId = memberships?.[0]?.tenant_id as string | undefined;
	const facilityId = await resolveSelectedFacilityId(supabase);

	let query = supabase
		.from("appointments")
		.select("*")
		.order("appointment_date");
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
	const facId = await resolveSelectedFacilityId(supabase);

	const payload = {
		...form,
		appointment_date: new Date(
			`${form.appointment_date}T${form.appointment_time || "00:00"}`,
		),
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
    title={t("appointments.title")}
    subtitle={t("appointments.subtitle")}
  />

  <Tabs bind:value={activeTab} class="w-full">
    <TabsList
      class="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-muted/50 p-1"
    >
      <TabsTrigger
        value="create"
        class="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      >
        {t("appointments.tabsCreate")}
      </TabsTrigger>
      <TabsTrigger
        value="upcoming"
        class="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      >
        {t("appointments.tabsUpcoming")}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="create" class="mt-8">
      <Card class="rounded-xl border bg-surface shadow-sm">
        <div class="p-6">
          <h2 class="text-base font-semibold text-foreground">
            {t("appointments.createTitle")}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {t("appointments.createSubtitle")}
          </p>

          <div class="mt-6 grid gap-6 md:grid-cols-2">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <Label for="customer_name" class="text-sm">
                  {t("common.customerName")}
                </Label>
                <Input
                  id="customer_name"
                  placeholder={t("common.customerPlaceholder")}
                  bind:value={form.customer_name}
                  class="rounded-md"
                />
              </div>

              <div class="flex flex-col gap-2">
                <Label for="contact_info" class="text-sm">
                  {t("common.contactInfo")}
                </Label>
                <Input
                  id="contact_info"
                  placeholder={t("common.contactPlaceholder")}
                  bind:value={form.contact_info}
                  class="rounded-md"
                />
              </div>

              <div class="flex flex-col gap-2">
                <Label for="appointment_date" class="text-sm">
                  {t("common.dateTime")}
                </Label>
                <div class="grid grid-cols-[1fr_auto] items-center gap-2">
                  <DateInput
                    id="appointment_date"
                    bind:value={form.appointment_date}
                    placeholder={t("date.placeholder")}
                  />
                  <Input
                    id="appointment_time"
                    type="time"
                    bind:value={form.appointment_time}
                    class="w-28 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <Label for="num_children" class="text-sm">
                    {t("appointments.children")}
                  </Label>
                  <Input
                    id="num_children"
                    type="number"
                    min="1"
                    bind:value={form.num_children}
                    class="rounded-md"
                  />
                </div>

                <div class="flex flex-col gap-2">
                  <Label for="num_adults" class="text-sm">
                    {t("appointments.adults")}
                  </Label>
                  <Input
                    id="num_adults"
                    type="number"
                    min="0"
                    bind:value={form.num_adults}
                    class="rounded-md"
                  />
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <Label for="notes" class="text-sm">
                  {t("common.notes")}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={t("common.notesPlaceholder")}
                  bind:value={form.notes}
                  class="min-h-24 rounded-md"
                />
              </div>

              <Button
                type="button"
                onclick={create}
                class="h-10 rounded-md text-sm font-medium"
              >
                {t("appointments.createButton")}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </TabsContent>

    <TabsContent value="upcoming" class="mt-8">
      <Card class="rounded-xl border bg-surface shadow-sm">
        <div class="p-6">
          <h2 class="text-base font-semibold text-foreground">
            {t("appointments.allAppointments")}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {t("appointments.manageExisting")}
          </p>

          {#if list.length === 0}
            <div
              class="mt-4 grid place-items-center gap-4 rounded-xl border border-dashed border-outline-soft/60 bg-muted/20 px-8 py-12 text-center"
            >
              <div
                class="grid size-16 place-items-center rounded-full bg-muted/30"
              >
                <svg
                  class="size-8 text-muted-foreground/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <title>{t("appointments.title")}</title>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div class="flex flex-col gap-1">
                <h3 class="text-base font-semibold text-foreground">
                  {t("appointments.emptyTitle")}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {t("appointments.emptySubtitle")}
                </p>
              </div>
              <Button
                type="button"
                class="rounded-md"
                onclick={() => (activeTab = "create")}
              >
                {t("appointments.createCta")}
              </Button>
            </div>
          {:else}
            <div class="mt-4 flex flex-col gap-3">
              {#each list as appointment}
                <div
                  class="flex items-center justify-between gap-4 rounded-xl border bg-surface px-4 py-4 transition-colors hover:bg-muted/40"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-3">
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
                      class="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
                    >
                      <span>
                        {appointment.display_date ||
                          formatDateTime(appointment.appointment_date)}
                      </span>
                      <span>
                        {appointment.num_children}
                        {t("appointments.children").toLowerCase()}
                      </span>
                      <span>
                        {appointment.num_adults}
                        {t("appointments.adults").toLowerCase()}
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
                      {t(`appointments.status.${appointment.status}` as any)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="rounded-md"
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
    class="sm:max-w-[520px] rounded-xl border bg-surface/95 shadow-xl"
  >
    <DialogHeader>
      <DialogTitle class="text-base font-semibold text-foreground">
        {t("appointments.editTitle")}
      </DialogTitle>
    </DialogHeader>

    <div class="grid gap-4 py-2">
      <div class="grid grid-cols-4 items-center gap-3 text-sm">
        <Label class="text-right">{t("common.status")}</Label>
        <div class="col-span-3">
          <Select bind:value={editStatus} type="single">
            <SelectTrigger class="w-full rounded-md">
              <span data-slot="select-value" class="truncate">
                {t(`appointments.status.${editStatus}` as any)}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="confirmed"
                label={t("appointments.status.confirmed")}
              />
              <SelectItem
                value="completed"
                label={t("appointments.status.completed")}
              />
              <SelectItem
                value="cancelled"
                label={t("appointments.status.cancelled")}
              />
            </SelectContent>
          </Select>
        </div>
      </div>

      {#if editing}
        <div class="grid grid-cols-4 items-center gap-3 text-sm">
          <Label class="text-right" for="edit_customer_name"
            >{t("common.customerName")}</Label
          >
          <Input
            id="edit_customer_name"
            class="col-span-3 rounded-md"
            bind:value={editing.customer_name}
          />
        </div>

        <div class="grid grid-cols-4 items-center gap-3 text-sm">
          <Label class="text-right" for="edit_contact_info"
            >{t("common.contactInfo")}</Label
          >
          <Input
            id="edit_contact_info"
            class="col-span-3 rounded-md"
            bind:value={editing.contact_info}
          />
        </div>

        <div class="grid grid-cols-4 items-center gap-3 text-sm">
          <Label class="text-right">{t("common.dateTime")}</Label>
          <div class="col-span-3 grid grid-cols-[1fr_auto] items-center gap-2">
            <DateInput
              bind:value={editDate}
              placeholder={t("date.placeholder")}
            />
            <Input class="w-28 rounded-md" type="time" bind:value={editTime} />
          </div>
        </div>

        <div class="grid grid-cols-4 items-center gap-3 text-sm">
          <Label class="text-right" for="edit_children"
            >{t("appointments.children")}</Label
          >
          <Input
            id="edit_children"
            class="col-span-3 w-40 rounded-md"
            type="number"
            min="1"
            bind:value={editing.num_children}
          />
        </div>

        <div class="grid grid-cols-4 items-center gap-3 text-sm">
          <Label class="text-right" for="edit_adults"
            >{t("appointments.adults")}</Label
          >
          <Input
            id="edit_adults"
            class="col-span-3 w-40 rounded-md"
            type="number"
            min="0"
            bind:value={editing.num_adults}
          />
        </div>

        <div class="grid grid-cols-4 items-center gap-3 text-sm">
          <Label class="text-right" for="edit_notes">{t("common.notes")}</Label>
          <Textarea
            id="edit_notes"
            class="col-span-3 min-h-24 rounded-md"
            bind:value={editing.notes}
          />
        </div>
      {/if}
    </div>

    <DialogFooter class="flex gap-2">
      <Button
        type="button"
        variant="outline"
        class="rounded-md"
        onclick={() => (showEdit = false)}
      >
        {t("common.cancel")}
      </Button>
      <Button type="button" class="rounded-md" onclick={saveEdit}>
        {t("common.save")}
      </Button>
    </DialogFooter>
  </DialogContent>
</DialogRoot>
