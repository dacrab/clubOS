<script lang="ts">
import { Calendar, Trophy } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";
import { Card } from "$lib/components/ui/card";
import { PageContent, PageHeader } from "$lib/components/ui/page";
import { t } from "$lib/state/i18n.svelte";

const upcoming = $state(0);
</script>

<PageContent>
  <PageHeader title={t("dashboard.secretary.title")} subtitle={t("dashboard.secretary.appointmentsDesc")} />

  <div class="grid gap-6 md:grid-cols-2">
    <Card class="border-border shadow-sm hover:border-primary/20 transition-colors">
      <div class="p-6 flex flex-col gap-6">
        <div class="flex items-start gap-4">
          <div class="grid size-12 place-items-center rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <Calendar class="size-6" />
          </div>
          <div class="space-y-1">
            <h3 class="font-semibold leading-none">{t("appointments.title")}</h3>
            <p class="text-sm text-muted-foreground">{t("dashboard.secretary.appointmentsDesc")}</p>
          </div>
        </div>
        <Button href="/secretary/birthdays" variant="outline" class="w-full">
          {t("dashboard.secretary.manage")}
        </Button>
      </div>
    </Card>

    <Card class="border-border shadow-sm hover:border-primary/20 transition-colors">
      <div class="p-6 flex flex-col gap-6">
        <div class="flex items-start gap-4">
          <div class="grid size-12 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Trophy class="size-6" />
          </div>
          <div class="space-y-1">
            <h3 class="font-semibold leading-none">{t("nav.football")}</h3>
            <p class="text-sm text-muted-foreground">{t("dashboard.secretary.footballDesc")}</p>
          </div>
        </div>
        <Button href="/secretary/football" variant="outline" class="w-full">
          {t("dashboard.secretary.manage")}
        </Button>
      </div>
    </Card>
  </div>
</PageContent>
