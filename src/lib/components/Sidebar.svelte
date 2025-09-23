<script lang="ts">
import {
  ClipboardList,
  Home,
  LogOut,
  Moon,
  Package,
  Sun,
  UserCog,
  ReceiptText,
} from "@lucide/svelte";
import { page } from "$app/stores";
import { locale, t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";
import { currentUser } from "$lib/user";

const linkBase =
  "flex items-center gap-1.5 h-8 px-2 rounded-md text-[13px] whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground";
const activeCls = "bg-accent text-accent-foreground";

function isActive(path: string): boolean {
  return $page.url.pathname.startsWith(path);
}

async function logout(): Promise<void> {
  await supabase.auth.signOut();
  window.location.href = "/";
}

let theme = $state<"light" | "dark">("dark");
$effect(() => {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark")
    theme = stored as "light" | "dark";
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
});
function toggleTheme() {
  theme = theme === "dark" ? "light" : "dark";
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  window.localStorage.setItem("theme", theme);
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
        <Home class="w-3.5 h-3.5" /> {t('nav.dashboard')}
      </a>
      

      {#if $currentUser?.role === 'admin'}
        <div class="pt-4">
          <div class="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t('nav.admin')}</div>
        </div>
        <a href="/admin/products" class={`${linkBase} ${isActive('/admin/products') ? activeCls : ''}`} aria-current={isActive('/admin/products') ? 'page' : undefined}>
          <Package class="w-3.5 h-3.5" /> {t('nav.products')}
        </a>
        <a href="/admin/users" class={`${linkBase} ${isActive('/admin/users') ? activeCls : ''}`} aria-current={isActive('/admin/users') ? 'page' : undefined}>
          <UserCog class="w-3.5 h-3.5" /> {t('nav.users')}
        </a>
        <a href="/admin/orders" class={`${linkBase} ${isActive('/admin/orders') ? activeCls : ''}`} aria-current={isActive('/admin/orders') ? 'page' : undefined}>
          <ReceiptText class="w-3.5 h-3.5" /> {t('nav.orders')}
        </a>
        <a href="/admin/registers" class={`${linkBase} ${isActive('/admin/registers') ? activeCls : ''}`} aria-current={isActive('/admin/registers') ? 'page' : undefined}>
          <ClipboardList class="w-3.5 h-3.5" /> {t('nav.registers')}
        </a>
        
      {/if}

      {#if $currentUser?.role === 'admin' || $currentUser?.role === 'secretary'}
        <div class="pt-4">
          <div class="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">{t('nav.bookings')}</div>
        </div>
        <a href="/secretary/birthdays" class={`${linkBase} ${isActive('/secretary/birthdays') ? activeCls : ''}`} aria-current={isActive('/secretary/birthdays') ? 'page' : undefined}>
          <ClipboardList class="w-3.5 h-3.5" /> {t('nav.birthdays')}
        </a>
        <a href="/secretary/football" class={`${linkBase} ${isActive('/secretary/football') ? activeCls : ''}`} aria-current={isActive('/secretary/football') ? 'page' : undefined}>
          <ClipboardList class="w-3.5 h-3.5" /> {t('nav.football')}
        </a>
      {/if}
    </nav>

    <!-- Footer -->
    <div class="mt-6">
      <div class="flex items-center gap-1.5">
        <div class="inline-flex items-center gap-1 rounded-md border p-0.5 h-8">
          <button type="button" class={`${$locale==='en' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} px-1.5 h-7 rounded text-xs`} aria-pressed={$locale==='en'} onclick={() => { locale.set('en'); }}>
            EN
          </button>
          <button type="button" class={`${$locale==='el' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} px-1.5 h-7 rounded text-xs`} aria-pressed={$locale==='el'} onclick={() => { locale.set('el'); }}>
            EL
          </button>
        </div>
        <button type="button" class="inline-flex items-center justify-center h-8 w-8 rounded-md border ${linkBase} !px-0" onclick={toggleTheme} aria-label={t('common.toggleTheme')}>
          {#if theme === 'dark'}
            <Sun class="w-3.5 h-3.5" />
          {:else}
            <Moon class="w-3.5 h-3.5" />
          {/if}
        </button>
        <button type="button" class="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-md text-[13px] transition-colors bg-destructive text-white hover:bg-destructive/90" onclick={logout}>
          <LogOut class="w-3.5 h-3.5" /> {t('nav.logout')}
        </button>
      </div>
    </div>
  </div>
</aside>
