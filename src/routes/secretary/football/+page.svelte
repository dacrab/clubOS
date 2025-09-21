<script lang="ts">
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";

type Booking = {
  id: string;
  status: "confirmed" | "cancelled" | "completed";
  field_number: number;
  booking_datetime: string;
  customer_name: string;
  contact_info: string;
  num_players: number;
};
let list: Booking[] = $state([] as Booking[]);
let form = $state({
  customer_name: "",
  contact_info: "",
  booking_datetime: "",
  field_number: 1,
  num_players: 10,
  notes: "",
});

import { toast } from "svelte-sonner";
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import Label from "$lib/components/ui/label/label.svelte";
import Textarea from "$lib/components/ui/textarea/textarea.svelte";

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
  list = (data as any) ?? [];
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
    booking_datetime: new Date(form.booking_datetime),
    created_by: user.id,
  };
  const { error } = await supabase.from("football_bookings").insert(payload);
  if (!error) {
    form = {
      customer_name: "",
      contact_info: "",
      booking_datetime: "",
      field_number: 1,
      num_players: 10,
      notes: "",
    };
    load();
  }
}

async function setStatus(
  id: string,
  status: "confirmed" | "cancelled" | "completed"
) {
  await supabase.from("football_bookings").update({ status }).eq("id", id);
  await load();
}

const PHONE_RE = /^\+?\d[\d\s()-]{5,}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function sendReminder(b: Booking) {
  const when = new Date(b.booking_datetime).toLocaleString();
  const message = encodeURIComponent(
    `Reminder: ${b.customer_name}, your field booking is at ${when}.`
  );
  const contact = String(b.contact_info || "").trim();
  if (PHONE_RE.test(contact)) {
    window.location.href = `tel:${contact}`;
    toast.success("Opening dialer for reminder call");
  } else if (EMAIL_RE.test(contact)) {
    window.location.href = `mailto:${contact}?subject=Booking%20Reminder&body=${message}`;
    toast.success("Opening email client for reminder");
  } else {
    toast.error("Invalid contact info to send reminder");
  }
}
</script>

<section class="space-y-4">
  <h1 class="text-2xl font-semibold">Football Bookings</h1>
  <div class="grid gap-3 max-w-xl">
    <div class="grid grid-cols-4 items-center gap-3">
      <Label class="text-right">Customer</Label>
      <Input class="col-span-3" placeholder="Customer name" bind:value={form.customer_name} />
    </div>
    <div class="grid grid-cols-4 items-center gap-3">
      <Label class="text-right">Contact</Label>
      <Input class="col-span-3" placeholder="Contact info" bind:value={form.contact_info} />
    </div>
    <div class="grid grid-cols-4 items-center gap-3">
      <Label class="text-right">Date & Time</Label>
      <Input class="col-span-3" type="datetime-local" bind:value={form.booking_datetime} />
    </div>
    <div class="grid grid-cols-4 items-center gap-3">
      <Label class="text-right">Field</Label>
      <Input class="col-span-3 w-40" type="number" min="1" max="5" bind:value={form.field_number} />
    </div>
    <div class="grid grid-cols-4 items-center gap-3">
      <Label class="text-right">Players</Label>
      <Input class="col-span-3 w-40" type="number" min="2" max="12" bind:value={form.num_players} />
    </div>
    <div class="grid grid-cols-4 items-center gap-3">
      <Label class="text-right">Notes</Label>
      <Textarea class="col-span-3" placeholder="Notes" bind:value={form.notes} />
    </div>
    <div class="flex justify-end">
      <Button onclick={create}>Create</Button>
    </div>
  </div>
  <h2 class="font-semibold mt-6">Upcoming</h2>
  <ul class="text-sm space-y-1">
    {#each list as b}
      <li>Field {b.field_number} — {new Date(b.booking_datetime).toLocaleString()} — {b.customer_name} ({b.contact_info}) — players {b.num_players}
        <span class="ml-2">[{b.status}]</span>
        <span class="ml-2">
          <Button variant="outline" onclick={() => sendReminder(b)}>Send Reminder</Button>
          <Button variant="outline" onclick={() => setStatus(b.id, 'confirmed')}>Confirm</Button>
          <Button variant="outline" onclick={() => setStatus(b.id, 'completed')}>Complete</Button>
          <Button variant="outline" onclick={() => setStatus(b.id, 'cancelled')}>Cancel</Button>
        </span>
      </li>
    {/each}
  </ul>
</section>


