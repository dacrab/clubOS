<script lang="ts">
import { supabase } from "$lib/supabaseClient";
import { currentUser, loadCurrentUser } from "$lib/user";

let list: Array<any> = $state([]);
let form = $state({
  customer_name: "",
  contact_info: "",
  appointment_date: "",
  num_children: 1,
  num_adults: 0,
  notes: "",
});

import { Calendar, ClipboardList, Clock } from "@lucide/svelte";
import { toast } from "svelte-sonner";
import { Button } from "$lib/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "$lib/components/ui/tabs";
import { Textarea } from "$lib/components/ui/textarea";

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
    appointment_date: new Date(form.appointment_date),
    created_by: user.id,
  };
  const { error } = await supabase.from("appointments").insert(payload);
  if (!error) {
    form = {
      customer_name: "",
      contact_info: "",
      appointment_date: "",
      num_children: 1,
      num_adults: 0,
      notes: "",
    } as any;
    load();
  }
}

async function setStatus(
  id: string,
  status: "confirmed" | "cancelled" | "completed"
) {
  await supabase.from("appointments").update({ status }).eq("id", id);
  await load();
}

const PHONE_RE = /^\+?\d[\d\s()-]{5,}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function sendReminder(a: any) {
  const when = new Date(a.appointment_date).toLocaleString();
  const message = encodeURIComponent(
    `Reminder: ${a.customer_name}, your appointment is at ${when}.`
  );
  const contact = String(a.contact_info || "").trim();
  if (PHONE_RE.test(contact)) {
    window.location.href = `tel:${contact}`;
    toast.success("Opening dialer for reminder call");
  } else if (EMAIL_RE.test(contact)) {
    window.location.href = `mailto:${contact}?subject=Appointment%20Reminder&body=${message}`;
    toast.success("Opening email client for reminder");
  } else {
    toast.error("Invalid contact info to send reminder");
  }
}
</script>

<section class="space-y-8">
  <!-- Header -->
  <div class="text-center space-y-4 pb-2">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 mb-4">
      <ClipboardList class="w-8 h-8 text-purple-600 dark:text-purple-400" />
    </div>
    <div>
      <h1 class="text-3xl font-bold gradient-text mb-2">Appointments</h1>
      <p class="text-muted-foreground text-lg">Manage birthday parties and events</p>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card class="card-hover bg-gradient-to-br from-purple-50 to-purple-50 dark:from-purple-950/20 dark:to-purple-950/20">
      <CardContent class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/50">
            <ClipboardList class="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-purple-700 dark:text-purple-300">{list.length}</p>
            <p class="text-sm text-purple-600 dark:text-purple-400">Total Bookings</p>
          </div>
        </div>
        <h3 class="font-semibold text-purple-800 dark:text-purple-200">Active Appointments</h3>
      </CardContent>
    </Card>

    <Card class="card-hover bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/20">
      <CardContent class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50">
            <Calendar class="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {list.filter(a => new Date(a.appointment_date) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length}
            </p>
            <p class="text-sm text-blue-600 dark:text-blue-400">This Month</p>
          </div>
        </div>
        <h3 class="font-semibold text-blue-800 dark:text-blue-200">This Month</h3>
      </CardContent>
    </Card>

    <Card class="card-hover bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
      <CardContent class="p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 rounded-xl bg-green-100 dark:bg-green-900/50">
            <Clock class="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-green-700 dark:text-green-300">
              {list.filter(a => new Date(a.appointment_date) > new Date()).length}
            </p>
            <p class="text-sm text-green-600 dark:text-green-400">Upcoming</p>
          </div>
        </div>
        <h3 class="font-semibold text-green-800 dark:text-green-200">Next 7 Days</h3>
      </CardContent>
    </Card>
  </div>

  <!-- Main Content -->
  <Tabs value="create" class="w-full">
    <TabsList class="grid w-full grid-cols-2 lg:w-96">
      <TabsTrigger value="create" class="rounded-lg">Create New</TabsTrigger>
      <TabsTrigger value="upcoming" class="rounded-lg">View All</TabsTrigger>
    </TabsList>

    <TabsContent value="create" class="mt-8">
      <Card class="card-hover">
        <CardHeader class="pb-6">
          <CardTitle class="text-xl">Create New Appointment</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">Schedule a new birthday party or event</p>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div class="space-y-2">
                <Label class="text-sm font-medium">Customer Name</Label>
                <Input
                  placeholder="Enter customer name"
                  bind:value={form.customer_name}
                  class="h-11"
                />
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">Contact Information</Label>
                <Input
                  placeholder="Phone number or email"
                  bind:value={form.contact_info}
                  class="h-11"
                />
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">Date & Time</Label>
                <Input
                  type="datetime-local"
                  bind:value={form.appointment_date}
                  class="h-11"
                />
              </div>
            </div>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <Label class="text-sm font-medium">Children</Label>
                  <Input
                    type="number"
                    min="1"
                    bind:value={form.num_children}
                    class="h-11"
                  />
                </div>
                <div class="space-y-2">
                  <Label class="text-sm font-medium">Adults</Label>
                  <Input
                    type="number"
                    min="0"
                    bind:value={form.num_adults}
                    class="h-11"
                  />
                </div>
              </div>
              <div class="space-y-2">
                <Label class="text-sm font-medium">Additional Notes</Label>
                <Textarea
                  placeholder="Any special requirements or notes..."
                  bind:value={form.notes}
                  class="min-h-20"
                />
              </div>
              <Button onclick={create} size="lg" class="w-full h-12 rounded-xl">
                <ClipboardList class="mr-2 h-4 w-4" />
                Create Appointment
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
              <CardTitle class="text-xl">All Appointments</CardTitle>
              <p class="text-sm text-muted-foreground mt-1">Manage existing bookings and appointments</p>
            </div>
            <Button variant="outline" size="sm">
              Export List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {#if list.length === 0}
            <div class="text-center py-12">
              <ClipboardList class="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 class="text-lg font-semibold mb-2">No appointments yet</h3>
              <p class="text-muted-foreground mb-4">Start by creating your first appointment</p>
              <Button onclick={() => {
                const createTab = document.querySelector('[value="create"]') as HTMLElement;
                createTab?.click();
              }}>
                Create Appointment
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
                      <span>📅 {new Date(a.appointment_date).toLocaleDateString()}</span>
                      <span>🕐 {new Date(a.appointment_date).toLocaleTimeString()}</span>
                      <span>👶 {a.num_children} children, {a.num_adults} adults</span>
                    </div>
                    {#if a.notes}
                      <p class="text-sm text-muted-foreground mt-2 italic">"{a.notes}"</p>
                    {/if}
                  </div>
                  <div class="flex items-center gap-2 ml-4">
                    {#if (new Date(a.appointment_date).getTime() - Date.now()) <= 7 * 24 * 60 * 60 * 1000}
                      <span class="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 text-xs rounded-full">
                        Reminder in 1w
                      </span>
                    {/if}
                  <Button variant="outline" size="sm" onclick={() => sendReminder(a)} class="h-8 px-2">
                    Send Reminder
                  </Button>
                    <span class="px-3 py-1 bg-{a.status === 'confirmed' ? 'green' : a.status === 'completed' ? 'blue' : 'red'}-100 dark:bg-{a.status === 'confirmed' ? 'green' : a.status === 'completed' ? 'blue' : 'red'}-900/50 text-{a.status === 'confirmed' ? 'green' : a.status === 'completed' ? 'blue' : 'red'}-700 dark:text-{a.status === 'confirmed' ? 'green' : a.status === 'completed' ? 'blue' : 'red'}-300 text-xs font-medium rounded-full capitalize">
                      {a.status}
                    </span>
                    <div class="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => setStatus(a.id, 'confirmed')}
                        class="h-8 px-2"
                      >
                        ✓
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => setStatus(a.id, 'completed')}
                        class="h-8 px-2"
                      >
                        ✓
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onclick={() => setStatus(a.id, 'cancelled')}
                        class="h-8 px-2"
                      >
                        ✕
                      </Button>
                    </div>
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


