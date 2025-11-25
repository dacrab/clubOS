<script lang="ts">
import { Calendar, Edit2, Trophy } from "@lucide/svelte";
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
import { t } from "$lib/state/i18n.svelte";
import { userState } from "$lib/state/user.svelte";
import { supabase } from "$lib/utils/supabase";
import { formatDateTime } from "$lib/utils/utils";

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
	const { data: sessionData } = await supabase.auth.getUser();
	const userId = sessionData.user?.id ?? "";
	const { data: memberships } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", userId);
	const tenantId = memberships?.[0]?.tenant_id;
	const facilityId = await facilityState.resolveSelected();
	let query = supabase.from("football_bookings").select("*").order("booking_datetime");
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
		booking_datetime: new Date(`${form.booking_date}T${form.booking_time || "00:00"}`),
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
  <PageHeader title={t("football.title")} subtitle={t("football.subtitle")} />

  <Tabs bind:value={activeTab} class="w-full">
    <div class="w-full border-b border-border/60">
      <TabsList class="bg-transparent p-0">
        <TabsTrigger
          value="create"
          class="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
        >
          {t("football.tabsCreate")}
        </TabsTrigger>
        <TabsTrigger
          value="upcoming"
          class="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
        >
          {t("football.tabsUpcoming")}
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent value="create" class="mt-6">
      <Card class="border-border shadow-sm">
        <div class="p-6 space-y-6">
          <div class="grid gap-6 md:grid-cols-2">
            <div class="space-y-4">
              <div class="space-y-2">
                <Label>{t("common.customerName")}</Label>
                <Input bind:value={form.customer_name} placeholder={t("common.customerPlaceholder")} />
              </div>
              <div class="space-y-2">
                <Label>{t("common.contactInfo")}</Label>
                <Input bind:value={form.contact_info} placeholder={t("common.contactPlaceholder")} />
              </div>
              <div class="space-y-2">
                <Label>{t("common.dateTime")}</Label>
                <div class="flex gap-2">
                  <DateInput bind:value={form.booking_date} placeholder={t("date.placeholder")} class="flex-1" />
                  <Input type="time" bind:value={form.booking_time} class="w-32" />
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label>{t("football.field")}</Label>
                  <Input type="number" min="1" max="5" bind:value={form.field_number} />
                </div>
                <div class="space-y-2">
                  <Label>{t("football.players")}</Label>
                  <Input type="number" min="2" max="12" bind:value={form.num_players} />
                </div>
              </div>
              <div class="space-y-2">
                <Label>{t("common.notes")}</Label>
                <Textarea bind:value={form.notes} placeholder={t("common.notesPlaceholder")} class="min-h-[100px]" />
              </div>
              <Button onclick={create} class="w-full">{t("football.createButton")}</Button>
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
              <Trophy class="size-12 opacity-20 mb-4" />
              <h3 class="text-lg font-medium text-foreground">{t("football.empty.title")}</h3>
              <p class="text-sm mb-4">{t("football.empty.description")}</p>
              <Button variant="outline" onclick={() => (activeTab = "create")}>
                {t("football.createButton")}
              </Button>
            </div>
          {:else}
            <div class="space-y-4">
              {#each list as booking}
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <h4 class="font-semibold">{booking.customer_name}</h4>
                      <span class={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        booking.status === "confirmed" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"
                      }`}>
                        {t(`football.status.${booking.status}` as any)}
                      </span>
                    </div>
                    <div class="flex gap-3 text-sm text-muted-foreground">
                      <span>{formatDateTime(booking.booking_datetime)}</span>
                      <span>{t("football.fieldLabel")} {booking.field_number}</span>
                      <span>{booking.num_players} {t("football.players").toLowerCase()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onclick={() => openEdit(booking)}>
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
        <DialogTitle>{t("football.editTitle")}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        {#if editing}
          <div class="grid gap-2">
            <Label>{t("common.status")}</Label>
            <Select bind:value={editStatus} type="single">
              <SelectTrigger>
                {t(`football.status.${editStatus}` as any)}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed" label={t("football.status.confirmed")} />
                <SelectItem value="completed" label={t("football.status.completed")} />
                <SelectItem value="cancelled" label={t("football.status.cancelled")} />
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
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label>{t("football.field")}</Label>
              <Input type="number" min="1" max="5" bind:value={editing.field_number} />
            </div>
            <div class="grid gap-2">
              <Label>{t("football.players")}</Label>
              <Input type="number" min="2" max="12" bind:value={editing.num_players} />
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
