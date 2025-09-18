<script lang="ts">
  import { currentUser, loadCurrentUser } from '$lib/user';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { t } from '$lib/i18n';

  $effect(() => {
    loadCurrentUser().then(() => {
      const u = $currentUser;
      if (!u) return (window.location.href = '/login');
      if (u.role !== 'secretary') window.location.href = '/dashboard';
    });
  });
</script>

<section class="space-y-4">
  <h1 class="text-2xl font-semibold">Secretary Dashboard</h1>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Card>
        <CardHeader><CardTitle>{t('nav.appointments')}</CardTitle></CardHeader>
        <CardContent class="flex flex-col gap-2">
            <p class="text-sm text-gray-500">Manage birthday parties and events.</p>
            <Button href="/secretary/appointments">Manage</Button>
        </CardContent>
    </Card>
    <Card>
        <CardHeader><CardTitle>{t('nav.football')}</CardTitle></CardHeader>
        <CardContent class="flex flex-col gap-2">
            <p class="text-sm text-gray-500">Manage football field reservations.</p>
            <Button href="/secretary/football">Manage</Button>
        </CardContent>
    </Card>
  </div>
</section>


