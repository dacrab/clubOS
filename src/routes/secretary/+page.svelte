<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'secretary') window.location.href = '/dashboard';
    });
  });
</script>

<section class="p-4 space-y-4">
  <h1 class="text-xl font-semibold">Secretary Dashboard</h1>
  <ul class="list-disc pl-5">
    <li>
      Manage appointments (upcoming 1 week reminders pending — will add scheduled job)
    </li>
    <li>Manage football bookings</li>
    <li>Upcoming reminders</li>
  </ul>
</section>


