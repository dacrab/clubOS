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

  <div class="grid gap-6 md:grid-cols-2">
    <Card class="rounded-3xl border border-outline-soft bg-surface shadow-sm">
      <div class="flex flex-col gap-4 p-6">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("pages.appointments.title")}
          </span>
          <p class="text-sm text-muted-foreground">
            {t("dashboard.secretary.appointmentsDesc")}
          </p>
        </div>
        <Button href="/secretary/birthdays" variant="outline" class="rounded-full">
          {t("dashboard.secretary.manage")}
        </Button>
      </div>
    </Card>

    <Card class="rounded-3xl border border-outline-soft bg-surface shadow-sm">
      <div class="flex flex-col gap-4 p-6">
        <div class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("nav.football")}
          </span>
          <p class="text-sm text-muted-foreground">
            {t("dashboard.secretary.footballDesc")}
          </p>
        </div>
        <Button href="/secretary/football" variant="outline" class="rounded-full">
          {t("dashboard.secretary.manage")}
        </Button>
      </div>
    </Card>
  </div>
</PageContent>


