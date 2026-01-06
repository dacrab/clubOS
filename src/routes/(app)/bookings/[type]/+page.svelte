<script lang="ts">
	import { BookingPage } from "$lib/components/features";
	import { Cake, Dribbble, Calendar, MoreHorizontal } from "@lucide/svelte";

	const { data } = $props();

	const icons = {
		birthday: Cake,
		football: Dribbble,
		event: Calendar,
		other: MoreHorizontal,
	} as const;

	const validTypes = ["birthday", "football"] as const;
	type ValidType = (typeof validTypes)[number];
	const isValidType = (t: string): t is ValidType => validTypes.includes(t as ValidType);
</script>

{#if isValidType(data.type)}
	<BookingPage type={data.type} bookings={data.bookings} user={data.user} icon={icons[data.type]} />
{/if}
