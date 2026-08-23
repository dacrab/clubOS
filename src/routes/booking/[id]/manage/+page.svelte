<script lang="ts">
import Button from "$lib/components/ui/button/button.svelte";
import Card, { CardContent, CardHeader, CardTitle } from "$lib/components/ui/card/card.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import { t } from "$lib/i18n/index.svelte";
import { type Booking, DEFAULT_TIMEZONE } from "$lib/types/database";

const { data, form } = $props();

function isBooking(v: unknown): v is Booking {
	if (!v || typeof v !== "object") return false;
	const b = v as Record<string, unknown>;
	return (
		typeof b.id === "string" &&
		typeof b.customerName === "string" &&
		typeof b.startsAt === "string" &&
		typeof b.status === "string"
	);
}

let booking = $derived(isBooking(data.booking) ? data.booking : ({} as Booking));

let cancelMode = $state(false);
let cancelReason = $state("");

let rescheduleMode = $state(false);
let rescheduleMessage = $state("");

function fmt(value: Date | string): string {
	return new Date(value).toLocaleString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: DEFAULT_TIMEZONE,
	});
}
</script>

<svelte:head>
	<title>{t("manage.title")} — ClubOS</title>
</svelte:head>

<div class="mx-auto max-w-lg px-4 py-12">
	<Card>
		<CardHeader>
			<CardTitle>{t("manage.yourBooking")}</CardTitle>
		</CardHeader>
		<CardContent class="space-y-3">
			<p><strong>{t("manage.name")}:</strong> {booking.customerName}</p>
			<p><strong>{t("manage.phone")}:</strong> {booking.customerPhone ?? "—"}</p>
			<p><strong>{t("manage.date")}:</strong> {fmt(booking.startsAt)}</p>
			<p><strong>{t("manage.type")}:</strong> {booking.type}</p>
			<p><strong>{t("manage.status")}:</strong> {t(`bookings.status.${booking.status}`)}</p>
			{#if booking.notes}
				<p><strong>{t("common.notes")}:</strong> {booking.notes}</p>
			{/if}
		</CardContent>
	</Card>

	<div class="mt-6 flex flex-wrap gap-3">
		<Button variant="destructive" onclick={() => { cancelMode = true; rescheduleMode = false; }}>
			{t("manage.cancelBooking")}
		</Button>
		<Button variant="secondary" onclick={() => { rescheduleMode = true; cancelMode = false; }}>
			{t("manage.requestReschedule")}
		</Button>
	</div>

	{#if cancelMode}
		<form method="POST" action="?/cancel" class="mt-6 space-y-3">
			<input type="hidden" name="reason" bind:value={cancelReason} />
			<div class="space-y-2">
				<Label for="reason">{t("manage.reasonLabel")}</Label>
				<Input id="reason" bind:value={cancelReason} placeholder={t("manage.reasonPlaceholder")} />
			</div>
			<Button variant="destructive" type="submit">{t("manage.confirmCancellation")}</Button>
			<Button variant="ghost" onclick={() => { cancelMode = false; }}>{t("manage.keepBooking")}</Button>
		</form>
	{/if}

	{#if rescheduleMode}
		<form method="POST" action="?/reschedule" class="mt-6 space-y-3">
			<input type="hidden" name="message" bind:value={rescheduleMessage} />
			<div class="space-y-2">
				<Label for="message">{t("manage.messageLabel")}</Label>
				<Input id="message" bind:value={rescheduleMessage} placeholder={t("manage.messagePlaceholder")} />
			</div>
			<Button type="submit">{t("manage.sendRequest")}</Button>
			<Button variant="ghost" onclick={() => { rescheduleMode = false; }}>{t("common.cancel")}</Button>
		</form>
	{/if}

	{#if form?.success}
		<p class="mt-4 text-green-600">{t("manage.canceledSuccess")}</p>
	{/if}
	{#if form?.rescheduleSent}
		<p class="mt-4 text-green-600">{t("manage.rescheduleSent")}</p>
	{/if}
	{#if form?.rescheduleMessage}
		<p class="mt-4 text-red-600">{form.rescheduleMessage}</p>
	{/if}
</div>
