<script lang="ts">
import StatsCards from "$lib/components/common/StatsCards.svelte";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
import { t } from "$lib/i18n";

const upcoming = $state(0);

$effect(() => {
  /* loaded elsewhere, simplified for page */
});
</script>

<section class="space-y-8">
  <h1 class="text-xl font-semibold tracking-tight">{t('dashboard.secretary.title')}</h1>

  <StatsCards items={[
    { title: t('nav.birthdays'), value: String(upcoming), accent: 'yellow' },
  ]} />
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card>
      <CardHeader><CardTitle>{t('nav.birthdays')}</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-2">
        <p class="text-sm text-muted-foreground">{t('dashboard.secretary.appointmentsDesc')}</p>
        <Button href="/secretary/birthdays" variant="outline">{t('dashboard.secretary.manage')}</Button>
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>{t('nav.football')}</CardTitle></CardHeader>
      <CardContent class="flex flex-col gap-2">
        <p class="text-sm text-muted-foreground">{t('dashboard.secretary.footballDesc')}</p>
        <Button href="/secretary/football" variant="outline">{t('dashboard.secretary.manage')}</Button>
      </CardContent>
    </Card>
  </div>
</section>


