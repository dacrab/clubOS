<script lang="ts">
	import BookingPage from "$lib/components/features/booking-page.svelte";
	import { Cake, Dribbble, Calendar, MoreHorizontal } from "@lucide/svelte";
	import { BOOKING_TYPE } from "$lib/constants";
	import type { BookingTypeValue } from "$lib/constants";

	const { data } = $props();

	const icons = {
		[BOOKING_TYPE.BIRTHDAY]: Cake,
		[BOOKING_TYPE.FOOTBALL]: Dribbble,
		event: Calendar,
		other: MoreHorizontal,
	} satisfies Record<string, typeof Cake>;

	// data.type is BookingType (includes event/other), cast to BookingTypeValue for BookingPage
	const type = $derived(data.type as BookingTypeValue);
	const icon = $derived(icons[data.type] ?? Calendar);
</script>

<BookingPage {type} bookings={data.bookings} user={data.user} {icon} />
