<script lang="ts">
import { CalendarCheck, CalendarRange } from "@lucide/svelte";
import PageContent from "$lib/components/common/PageContent.svelte";
import PageHeader from "$lib/components/common/PageHeader.svelte";
import StatsCards from "$lib/components/common/StatsCards.svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { t } from "$lib/i18n";

const upcoming = $state(0);

$effect(() => {
  /* data loading handled elsewhere */
});
</script>

<PageContent>
  <PageHeader
    title={t("dashboard.secretary.title")}
    subtitle={t("dashboard.secretary.appointmentsDesc")}
    icon={CalendarCheck}
  />

  <StatsCards
    items={[
      {
        title: t("pages.appointments.title"),
        value: String(upcoming),
        accent: "yellow",
        icon: CalendarRange,
      },
    ]}
  />

  <div class="grid gap-5 md:grid-cols-2">
    <Card class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm">
      <div class="flex flex-col gap-4 px-6 py-6">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t("pages.appointments.title")}
          </span>
          <p class="text-sm text-muted-foreground">
            {t("dashboard.secretary.appointmentsDesc")}
          </p>
        </div>
        <Button href="/secretary/birthdays" variant="outline" class="rounded-lg">
          {t("dashboard.secretary.manage")}
        </Button>
      </div>
    </Card>

    <Card class="rounded-2xl border border-outline-soft/70 bg-surface-soft/80 shadow-sm">
      <div class="flex flex-col gap-4 px-6 py-6">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t("nav.football")}
          </span>
          <p class="text-sm text-muted-foreground">
            {t("dashboard.secretary.footballDesc")}
          </p>
        </div>
        <Button href="/secretary/football" variant="outline" class="rounded-lg">
          {t("dashboard.secretary.manage")}
        </Button>
      </div>
    </Card>
  </div>
</PageContent>


