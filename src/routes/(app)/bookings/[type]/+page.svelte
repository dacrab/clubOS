<script lang="ts">
import { Cake, CircleDot } from "@lucide/svelte";
import BookingPage from "$lib/components/features/booking-page.svelte";

const { data } = $props();

const icon = $derived(data.type === "birthday" ? Cake : CircleDot);
</script>

<BookingPage type={data.type} bookings={data.bookings} user={data.user} {icon} page={data.page} totalPages={data.totalPages} search={data.search} />
