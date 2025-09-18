<script lang="ts">
  import { currentUser } from '$lib/user';
  import { t } from '$lib/i18n';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Home, ShoppingCart, UserCog, ClipboardList, Package, Tags } from '@lucide/svelte';

  function isActive(path: string) {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith(path);
  }
</script>

<aside class="w-64 border-r bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/70 p-4 flex-flex-col fixed h-full">
  <div class="px-2 py-1 mb-3">
    <h2 class="text-lg font-semibold tracking-tight">clubOS</h2>
    <p class="text-xs text-muted-foreground">{t('nav.dashboard')}</p>
  </div>
  <nav class="flex flex-col gap-1 text-sm">
    <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/dashboard" data-active={isActive('/dashboard')}>
      <Home class="mr-2 h-4 w-4" /> {t('nav.dashboard')}
    </Button>
    <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/orders" data-active={isActive('/orders')}>
      <ShoppingCart class="mr-2 h-4 w-4" /> {t('nav.orders')}
    </Button>

    {#if $currentUser?.role === 'admin'}
      <div class="px-3 mt-3 mb-1 text-xs uppercase text-muted-foreground">{t('nav.admin')}</div>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/admin/products" data-active={isActive('/admin/products')}>
        <Package class="mr-2 h-4 w-4" /> {t('nav.products')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/admin/categories" data-active={isActive('/admin/categories')}>
        <Tags class="mr-2 h-4 w-4" /> {t('nav.categories')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/admin/users" data-active={isActive('/admin/users')}>
        <UserCog class="mr-2 h-4 w-4" /> {t('nav.users')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/admin/registers" data-active={isActive('/admin/registers')}>
        <ClipboardList class="mr-2 h-4 w-4" /> {t('nav.registers')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/admin/reports" data-active={isActive('/admin/reports')}>
        <ClipboardList class="mr-2 h-4 w-4" /> {t('nav.reports')}
      </Button>
    {/if}

    {#if $currentUser?.role === 'admin' || $currentUser?.role === 'secretary'}
      <div class="px-3 mt-3 mb-1 text-xs uppercase text-muted-foreground">{t('nav.bookings')}</div>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/secretary/appointments" data-active={isActive('/secretary/appointments')}>
        <ClipboardList class="mr-2 h-4 w-4" /> {t('nav.appointments')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent" href="/secretary/football" data-active={isActive('/secretary/football')}>
        <ClipboardList class="mr-2 h-4 w-4" /> {t('nav.football')}
      </Button>
    {/if}
  </nav>
</aside>
