<script lang="ts">
	import { BookingPage } from "$lib/components/features";
	import { Cake, Dribbble, Calendar, MoreHorizontal } from "@lucide/svelte";
	import { BOOKING_TYPE, type BookingTypeValue } from "$lib/constants";

	const { data } = $props();

	const icons = {
		[BOOKING_TYPE.BIRTHDAY]: Cake,
		[BOOKING_TYPE.FOOTBALL]: Dribbble,
		event: Calendar,
		other: MoreHorizontal,
	} as const;

	const validTypes = Object.values(BOOKING_TYPE);
	type ValidType = BookingTypeValue;
	const isValidType = (t: string): t is ValidType => validTypes.includes(t as ValidType);
</script>

{#if isValidType(data.type)}
	<BookingPage type={data.type} bookings={data.bookings} user={data.user} icon={icons[data.type]} />
{/if}
