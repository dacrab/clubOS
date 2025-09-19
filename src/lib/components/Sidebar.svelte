<script lang="ts">
  import { currentUser } from '$lib/user';
  import { t, locale } from '$lib/i18n';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Home, ShoppingCart, UserCog, ClipboardList, Package, Tags, LogOut } from '@lucide/svelte';
  import { supabase } from '$lib/supabaseClient';

  function isActive(path: string) {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith(path);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }
</script>

<aside class="w-64 border-r bg-sidebar/80 backdrop-blur supports-[backdrop-filter]:bg-sidebar/70 p-4 flex-flex-col fixed h-full">
  <div class="px-2 py-1 mb-3">
    <h2 class="text-lg font-semibold tracking-tight">clubOS</h2>
    <p class="text-xs text-muted-foreground">{t('nav.dashboard')}</p>
  </div>
  <nav class="flex flex-col gap-1 text-sm">
    <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/dashboard" data-active={isActive('/dashboard')} aria-current={isActive('/dashboard') ? 'page' : undefined}>
      <Home class="mr-2 h-4 w-4" /> {t('nav.dashboard')}
    </Button>
    <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/orders" data-active={isActive('/orders')} aria-current={isActive('/orders') ? 'page' : undefined}>
      <ShoppingCart class="mr-2 h-4 w-4" /> {t('nav.orders')}
    </Button>

    {#if $currentUser?.role === 'admin'}
      <div class="px-3 mt-3 mb-1 text-xs uppercase text-muted-foreground">{t('nav.admin')}</div>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/admin/products" data-active={isActive('/admin/products')} aria-current={isActive('/admin/products') ? 'page' : undefined}>
        <Package class="mr-2 h-4 w-4" /> {t('nav.products')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/admin/categories" data-active={isActive('/admin/categories')} aria-current={isActive('/admin/categories') ? 'page' : undefined}>
        <Tags class="mr-2 h-4 w-4" /> {t('nav.categories')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/admin/users" data-active={isActive('/admin/users')} aria-current={isActive('/admin/users') ? 'page' : undefined}>
        <UserCog class="mr-2 h-4 w-4" /> {t('nav.users')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/admin/registers" data-active={isActive('/admin/registers')} aria-current={isActive('/admin/registers') ? 'page' : undefined}>
        <ClipboardList class="mr-2 h-4 w-4" /> {t('nav.registers')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/admin/reports" data-active={isActive('/admin/reports')} aria-current={isActive('/admin/reports') ? 'page' : undefined}>
        <ClipboardList class="mr-2 h-4 w-4" /> {t('nav.reports')}
      </Button>
    {/if}

    {#if $currentUser?.role === 'admin' || $currentUser?.role === 'secretary'}
      <div class="px-3 mt-3 mb-1 text-xs uppercase text-muted-foreground">{t('nav.bookings')}</div>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/secretary/appointments" data-active={isActive('/secretary/appointments')} aria-current={isActive('/secretary/appointments') ? 'page' : undefined}>
        <ClipboardList class="mr-2 h-4 w-4" /> {t('nav.appointments')}
      </Button>
      <Button variant="ghost" class="justify-start data-[active=true]:bg-accent data-[active=true]:text-foreground rounded-md" href="/secretary/football" data-active={isActive('/secretary/football')} aria-current={isActive('/secretary/football') ? 'page' : undefined}>
        <ClipboardList class="mr-2 h-4 w-4" /> {t('nav.football')}
      </Button>
    {/if}
  </nav>

  <div class="absolute bottom-4 left-4 right-4 flex items-center gap-2">
    <select bind:value={$locale} class="h-9 px-2 rounded-md bg-muted text-foreground border-transparent flex-1">
      <option value="en">EN</option>
      <option value="el">EL</option>
    </select>
    <Button variant="destructive" class="flex-1" onclick={logout}>
      <LogOut class="mr-2 h-4 w-4" /> {t('nav.logout')}
    </Button>
  </div>
</aside>
