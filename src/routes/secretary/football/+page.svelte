<script lang="ts">
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import DateInput from "$lib/components/ui/date-input.svelte";
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
import { facilityState } from "$lib/state/facility.svelte";
import { tt as t } from "$lib/state/i18n.svelte";
import { userState } from "$lib/state/user.svelte";
import { formatDateTime } from "$lib/utils/utils";
import { supabase } from "$lib/utils/supabase";

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

type EditableBooking = Booking & { notes: string };

let list: Booking[] = $state([]);
let form = $state({
	customer_name: "",
	contact_info: "",
	booking_date: "",
	booking_time: "",
	field_number: 1,
	num_players: 10,
	notes: "",
});

let activeTab = $state<"create" | "upcoming">("create");
let showEdit = $state(false);
let editing: EditableBooking | null = $state(null);
let editStatus: "confirmed" | "cancelled" | "completed" = $state("confirmed");
let editDate = $state("");
let editTime = $state("");

$effect(() => {
	userState.load().then(() => {
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
	const facilityId = await facilityState.resolveSelected();
	let query = supabase
		.from("football_bookings")
		.select("*")
		.order("booking_datetime");
	if (tenantId) query = query.eq("tenant_id", tenantId);
	if (facilityId) query = query.eq("facility_id", facilityId);
	const { data } = await query;
	list = (data ?? []) as Booking[];
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
		customer_name: form.customer_name,
		contact_info: form.contact_info,
		booking_datetime: new Date(
			`${form.booking_date}T${form.booking_time || "00:00"}`,
		),
		field_number: Number(form.field_number || 1),
		num_players: Number(form.num_players || 0),
		notes: form.notes || null,
		created_by: user.id,
		tenant_id: membership?.[0]?.tenant_id,
		facility_id: facId,
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

function openEdit(booking: Booking) {
	editing = { ...booking, notes: booking.notes ?? "" };
	const date = new Date(booking.booking_datetime);
	const pad = (n: number) => String(n).padStart(2, "0");
	editDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	editTime = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
	editStatus = booking.status;
	showEdit = true;
}

async function saveEdit() {
	if (!editing) {
		return;
	}

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
  <PageHeader title={t("football.title")} subtitle={t("football.subtitle")} />

  <Tabs bind:value={activeTab} class="w-full">
    <TabsList
      class="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-muted/50 p-1"
    >
      <TabsTrigger
        value="create"
        class="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      >
        {t("football.tabsCreate")}
      </TabsTrigger>
      <TabsTrigger
        value="upcoming"
        class="rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
      >
        {t("football.tabsUpcoming")}
      </TabsTrigger>
    </TabsList>

    <TabsContent value="create" class="mt-8">
      <Card class="rounded-xl border bg-surface shadow-sm">
        <div class="p-6">
          <h2 class="text-base font-semibold text-foreground">
            {t("football.createTitle")}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {t("football.subtitle")}
          </p>
          <div class="mt-6 grid gap-6 md:grid-cols-2">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <Label for="fb_customer_name" class="text-sm"
                  >{t("common.customerName")}</Label
                >
                <Input
                  id="fb_customer_name"
                  bind:value={form.customer_name}
                  class="rounded-md"
                  placeholder={t("common.customerPlaceholder")}
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="fb_contact" class="text-sm"
                  >{t("common.contactInfo")}</Label
                >
                <Input
                  id="fb_contact"
                  placeholder={t("common.contactPlaceholder")}
                  bind:value={form.contact_info}
                  class="rounded-md"
                />
              </div>
              <div class="flex flex-col gap-2">
                <Label class="text-sm">{t("common.dateTime")}</Label>
                <div class="grid grid-cols-[1fr_auto] items-center gap-2">
                  <DateInput
                    bind:value={form.booking_date}
                    placeholder={t("date.placeholder")}
                  />
                  <Input
                    type="time"
                    bind:value={form.booking_time}
                    class="w-28 rounded-md"
                  />
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <Label for="fb_field" class="text-sm"
                    >{t("football.field")}</Label
                  >
                  <Input
                    id="fb_field"
                    type="number"
                    min="1"
                    max="5"
                    bind:value={form.field_number}
                    class="rounded-md"
                  />
                </div>
                <div class="flex flex-col gap-2">
                  <Label for="fb_players" class="text-sm"
                    >{t("football.players")}</Label
                  >
                  <Input
                    id="fb_players"
                    type="number"
                    min="2"
                    max="12"
                    bind:value={form.num_players}
                    class="rounded-md"
                  />
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <Label for="fb_notes" class="text-sm">{t("common.notes")}</Label
                >
                <Textarea
                  id="fb_notes"
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
                {t("football.createButton")}
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
            {t("football.upcomingTitle")}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {t("football.manageExisting")}
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
                  <title>{t("football.title")}</title>
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div class="flex flex-col gap-1">
                <h3 class="text-base font-semibold text-foreground">
                  {t("football.empty.title")}
                </h3>
                <p class="text-sm text-muted-foreground">
                  {t("football.empty.description")}
                </p>
              </div>
              <Button
                type="button"
                class="rounded-md"
                onclick={() => (activeTab = "create")}
              >
                {t("football.createButton")}
              </Button>
            </div>
          {:else}
            <div class="mt-4 flex flex-col gap-3">
              {#each list as booking}
                <div
                  class="flex items-center justify-between gap-4 rounded-xl border bg-surface px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-muted/40"
                >
                  <div class="min-w-0 flex-1">
                    <div class="font-semibold text-foreground">
                      {booking.customer_name}
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-3 text-xs">
                      <span>{formatDateTime(booking.booking_datetime)}</span>
                      <span
                        >{t("football.fieldLabel")}
                        {booking.field_number}</span
                      >
                      <span
                        >{booking.num_players}
                        {t("football.players").toLowerCase()}</span
                      >
                    </div>
                    <div class="mt-1 text-xs text-muted-foreground">
                      {booking.contact_info}
                    </div>
                    {#if booking.notes}
                      <div class="mt-2 text-xs italic text-muted-foreground">
                        "{booking.notes}"
                      </div>
                    {/if}
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      class={`rounded-lg px-3 py-1 text-xs font-medium capitalize ${booking.status === "confirmed" ? "bg-green-500/10 text-green-700 dark:text-green-300" : "bg-muted text-muted-foreground"}`}
                    >
                      {t(`football.status.${booking.status}` as any)}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="rounded-md"
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
  <DialogContent
    class="sm:max-w-[520px] rounded-2xl border border-outline-soft/70 bg-surface-soft/90 shadow-xl"
  >
    <DialogHeader>
      <DialogTitle>{t("football.editTitle")}</DialogTitle>
    </DialogHeader>
    <div class="grid gap-4 py-2">
      <div class="grid grid-cols-4 items-center gap-3">
        <Label class="text-right">{t("common.status")}</Label>
        <div class="col-span-3">
          <Select bind:value={editStatus} type="single">
            <SelectTrigger class="w-full">
              <span data-slot="select-value" class="truncate"
                >{t(`football.status.${editStatus}` as any)}</span
              >
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                value="confirmed"
                label={t("football.status.confirmed")}
              />
              <SelectItem
                value="completed"
                label={t("football.status.completed")}
              />
              <SelectItem
                value="cancelled"
                label={t("football.status.cancelled")}
              />
            </SelectContent>
          </Select>
        </div>
      </div>
      {#if editing}
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t("common.customerName")}</Label>
          <Input class="col-span-3" bind:value={editing.customer_name} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t("common.contactInfo")}</Label>
          <Input class="col-span-3" bind:value={editing.contact_info} />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t("common.dateTime")}</Label>
          <div class="col-span-3 grid grid-cols-[1fr_auto] gap-2 items-center">
            <DateInput
              bind:value={editDate}
              placeholder={t("date.placeholder")}
            />
            <Input class="w-28" type="time" bind:value={editTime} />
          </div>
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t("football.field")}</Label>
          <Input
            class="col-span-3 w-40"
            type="number"
            min="1"
            max="5"
            bind:value={editing.field_number}
          />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t("football.players")}</Label>
          <Input
            class="col-span-3 w-40"
            type="number"
            min="2"
            max="12"
            bind:value={editing.num_players}
          />
        </div>
        <div class="grid grid-cols-4 items-center gap-3">
          <Label class="text-right">{t("common.notes")}</Label>
          <Textarea class="col-span-3 min-h-20" bind:value={editing.notes} />
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button variant="outline" onclick={() => (showEdit = false)}
        >{t("common.cancel")}</Button
      >
      <Button onclick={saveEdit}>{t("common.save")}</Button>
    </DialogFooter>
  </DialogContent>
</DialogRoot>
