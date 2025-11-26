<script lang="ts">
	import { BookingPage } from "$lib/components/features";
	import { Cake } from "@lucide/svelte";

	const { data } = $props();
</script>

<BookingPage type="appointment" bookings={data.appointments} user={data.user} icon={Cake} />
