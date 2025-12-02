<script lang="ts">
	import { BookingPage } from "$lib/components/features";
	import { Dribbble } from "@lucide/svelte";

	const { data } = $props();
</script>

<BookingPage type="football" bookings={data.bookings} user={data.user} icon={Dribbble} />
