<script lang="ts">
	import BookingPage from "$lib/components/features/booking-page.svelte";
	import { Cake, CircleDot, Calendar, MoreHorizontal } from "@lucide/svelte";
	import type { BookingType } from "$lib/types/database";

	const { data } = $props();

	const icons = {
		birthday: Cake,
		football: CircleDot,
		event: Calendar,
		other: MoreHorizontal,
	} satisfies Record<string, typeof Cake>;

	// data.type is BookingType (includes event/other), cast to BookingType for BookingPage
	const type = $derived(data.type as BookingType);
	const icon = $derived(icons[data.type] ?? Calendar);
</script>

<BookingPage {type} bookings={data.bookings} user={data.user} {icon} />
