<script lang="ts">
  import { currentUser } from '$lib/user';
  import { t, locale } from '$lib/i18n';
  import { Home, ShoppingCart, UserCog, ClipboardList, Package, LogOut, BarChart3 } from '@lucide/svelte';
  import { supabase } from '$lib/supabaseClient';
  import { page } from '$app/stores';

  const linkBase = 'flex items-center gap-2 h-9 px-3 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground';
  const activeCls = 'bg-accent text-accent-foreground';

  function isActive(path: string): boolean {
    return $page.url.pathname.startsWith(path);
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut();
    window.location.href = '/';
  }
</script>

<aside class="w-64 fixed left-0 top-0 h-full z-30 bg-background border-r">
  <div class="p-6 flex flex-col h-full">
    <!-- Brand -->
    <div class="mb-6">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">C</div>
        <span class="text-base font-semibold">clubOS</span>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 space-y-1">
      <a href="/dashboard" class={`${linkBase} ${isActive('/dashboard') ? activeCls : ''}`} aria-current={isActive('/dashboard') ? 'page' : undefined}>
        <Home class="w-4 h-4" /> {t('nav.dashboard')}
      </a>
      <a href="/orders" class={`${linkBase} ${isActive('/orders') ? activeCls : ''}`} aria-current={isActive('/orders') ? 'page' : undefined}>
        <ShoppingCart class="w-4 h-4" /> {t('nav.orders')}
      </a>

      {#if $currentUser?.role === 'admin'}
        <div class="pt-4">
          <div class="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t('nav.admin')}</div>
        </div>
        <a href="/admin/products" class={`${linkBase} ${isActive('/admin/products') ? activeCls : ''}`} aria-current={isActive('/admin/products') ? 'page' : undefined}>
          <Package class="w-4 h-4" /> {t('nav.products')}
        </a>
        <a href="/admin/users" class={`${linkBase} ${isActive('/admin/users') ? activeCls : ''}`} aria-current={isActive('/admin/users') ? 'page' : undefined}>
          <UserCog class="w-4 h-4" /> {t('nav.users')}
        </a>
        <a href="/admin/registers" class={`${linkBase} ${isActive('/admin/registers') ? activeCls : ''}`} aria-current={isActive('/admin/registers') ? 'page' : undefined}>
          <ClipboardList class="w-4 h-4" /> {t('nav.registers')}
        </a>
        <a href="/admin/reports" class={`${linkBase} ${isActive('/admin/reports') ? activeCls : ''}`} aria-current={isActive('/admin/reports') ? 'page' : undefined}>
          <BarChart3 class="w-4 h-4" /> {t('nav.reports')}
        </a>
        <a href="/admin/bookings" class={`${linkBase} ${isActive('/admin/bookings') ? activeCls : ''}`} aria-current={isActive('/admin/bookings') ? 'page' : undefined}>
          <ClipboardList class="w-4 h-4" /> {t('nav.bookings')}
        </a>
      {/if}

      {#if $currentUser?.role === 'admin' || $currentUser?.role === 'secretary'}
        <div class="pt-4">
          <div class="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t('nav.bookings')}</div>
        </div>
        <a href="/secretary/appointments" class={`${linkBase} ${isActive('/secretary/appointments') ? activeCls : ''}`} aria-current={isActive('/secretary/appointments') ? 'page' : undefined}>
          <ClipboardList class="w-4 h-4" /> {t('nav.appointments')}
        </a>
        <a href="/secretary/football" class={`${linkBase} ${isActive('/secretary/football') ? activeCls : ''}`} aria-current={isActive('/secretary/football') ? 'page' : undefined}>
          <ClipboardList class="w-4 h-4" /> {t('nav.football')}
        </a>
      {/if}
    </nav>

    <!-- Footer -->
    <div class="mt-6 space-y-3">
      <select bind:value={$locale} class="w-full h-9 px-2 rounded-md border bg-background text-sm">
        <option value="en">English</option>
        <option value="el">Ελληνικά</option>
      </select>
      <button type="button" class="w-full ${linkBase} justify-start bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground" onclick={logout}>
        <LogOut class="w-4 h-4" /> {t('nav.logout')}
      </button>
    </div>
  </div>
</aside>
