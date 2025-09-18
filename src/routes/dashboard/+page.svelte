<script lang="ts">
  import { loadCurrentUser, currentUser } from '$lib/user';

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) {
        window.location.href = '/login';
        return;
      }
      if (u.role === 'admin') window.location.href = '/admin';
      else if (u.role === 'staff') window.location.href = '/staff';
      else if (u.role === 'secretary') window.location.href = '/secretary';
      else window.location.href = '/login';
    });
  });
</script>

<p>Loading dashboard…</p>


