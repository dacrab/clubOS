<script lang="ts">
  import { currentUser } from '$lib/user';
  import { t } from '$lib/i18n';
  import Button from '$lib/components/ui/button/button.svelte';
</script>

<aside class="w-64 border-r bg-background p-4 flex-flex-col fixed h-full">
  <h2 class="text-xl font-semibold mb-4">clubOS</h2>
  <nav class="flex flex-col gap-1 text-sm">
    <Button variant="ghost" class="justify-start" href="/dashboard">{t('nav.dashboard')}</Button>
    <Button variant="ghost" class="justify-start" href="/orders">{t('nav.orders')}</Button>

    {#if $currentUser?.role === 'admin'}
      <div class="px-3 mt-3 mb-1 text-xs uppercase text-gray-500">{t('nav.admin')}</div>
      <Button variant="ghost" class="justify-start" href="/admin/products">{t('nav.products')}</Button>
      <Button variant="ghost" class="justify-start" href="/admin/categories">{t('nav.categories')}</Button>
      <Button variant="ghost" class="justify-start" href="/admin/users">{t('nav.users')}</Button>
      <Button variant="ghost" class="justify-start" href="/admin/registers">Registers</Button>
      <Button variant="ghost" class="justify-start" href="/admin/reports">Reports</Button>
    {/if}

    {#if $currentUser?.role === 'admin' || $currentUser?.role === 'secretary'}
      <div class="px-3 mt-3 mb-1 text-xs uppercase text-gray-500">Bookings</div>
      <Button variant="ghost" class="justify-start" href="/secretary/appointments">{t('nav.appointments')}</Button>
      <Button variant="ghost" class="justify-start" href="/secretary/football">{t('nav.football')}</Button>
    {/if}
  </nav>
</aside>
