<script lang="ts">
import Button from "$lib/components/ui/button/button.svelte";
import Card, { CardContent, CardHeader, CardTitle } from "$lib/components/ui/card/card.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import type { Booking } from "$lib/types/database";

const { data, form } = $props();
let booking = $derived(data.booking as Booking);

let cancelMode = $state(false);
let cancelReason = $state("");

let rescheduleMode = $state(false);
let rescheduleMessage = $state("");

function fmt(iso: string): string {
	return new Date(iso).toLocaleString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Europe/Athens",
	});
}
</script>

<svelte:head>
	<title>Manage Booking — ClubOS</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-12">
	<Card>
		<CardHeader>
			<CardTitle>Your Booking</CardTitle>
		</CardHeader>
		<CardContent class="space-y-3">
			<p><strong>Name:</strong> {booking.customer_name}</p>
			<p><strong>Phone:</strong> {booking.customer_phone ?? "—"}</p>
			<p><strong>Date:</strong> {fmt(booking.starts_at)}</p>
			<p><strong>Type:</strong> {booking.type}</p>
			<p><strong>Status:</strong> {booking.status}</p>
			{#if booking.notes}
				<p><strong>Notes:</strong> {booking.notes}</p>
			{/if}
		</CardContent>
	</Card>

	<div class="mt-6 flex flex-wrap gap-3">
		<Button variant="destructive" onclick={() => { cancelMode = true; rescheduleMode = false; }}>
			Cancel Booking
		</Button>
		<Button variant="secondary" onclick={() => { rescheduleMode = true; cancelMode = false; }}>
			Request Reschedule
		</Button>
	</div>

	{#if cancelMode}
		<form method="POST" action="?/cancel" class="mt-6 space-y-3">
			<input type="hidden" name="reason" bind:value={cancelReason} />
			<div class="space-y-2">
				<Label for="reason">Reason (optional)</Label>
				<Input id="reason" bind:value={cancelReason} placeholder="Why are you canceling?" />
			</div>
			<Button variant="destructive" type="submit">Confirm Cancellation</Button>
			<Button variant="ghost" onclick={() => { cancelMode = false; }}>Keep Booking</Button>
		</form>
	{/if}

	{#if rescheduleMode}
		<form method="POST" action="?/reschedule" class="mt-6 space-y-3">
			<input type="hidden" name="message" bind:value={rescheduleMessage} />
			<div class="space-y-2">
				<Label for="message">Tell us your preferred new date/time</Label>
				<Input id="message" bind:value={rescheduleMessage} placeholder="e.g. same time next Saturday" />
			</div>
			<Button type="submit">Send Request</Button>
			<Button variant="ghost" onclick={() => { rescheduleMode = false; }}>Cancel</Button>
		</form>
	{/if}

	{#if form?.success}
		<p class="mt-4 text-green-600">Booking canceled successfully.</p>
	{/if}
	{#if form?.rescheduleSent}
		<p class="mt-4 text-green-600">Reschedule request sent. Staff will contact you.</p>
	{/if}
	{#if form?.message}
		<p class="mt-4 text-red-600">{form.message}</p>
	{/if}
</div>
