<script lang="ts">
import StatsCards from "$lib/components/common/StatsCards.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import CardContent from "$lib/components/ui/card/card-content.svelte";
import CardHeader from "$lib/components/ui/card/card-header.svelte";
import CardTitle from "$lib/components/ui/card/card-title.svelte";
import { t } from "$lib/i18n";

const upcoming = $state(0);

$effect(() => {
  /* loaded elsewhere, simplified for page */
});
</script>

<section class="space-y-8">
  <h1 class="text-xl font-semibold tracking-tight">{t('dashboard.secretary.title')}</h1>

  <StatsCards items={[
    { title: t('nav.appointments'), value: String(upcoming), accent: 'yellow' },
  ]} />
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card>
        <CardHeader><CardTitle>{t('nav.appointments')}</CardTitle></CardHeader>
        <CardContent class="flex flex-col gap-2">
            <p class="text-sm text-gray-500">{t('dashboard.secretary.appointmentsDesc')}</p>
            <Button href="/secretary/appointments">{t('dashboard.secretary.manage')}</Button>
        </CardContent>
    </Card>
    <Card>
        <CardHeader><CardTitle>{t('nav.football')}</CardTitle></CardHeader>
        <CardContent class="flex flex-col gap-2">
            <p class="text-sm text-gray-500">{t('dashboard.secretary.footballDesc')}</p>
            <Button href="/secretary/football">{t('dashboard.secretary.manage')}</Button>
        </CardContent>
    </Card>
  </div>
</section>


