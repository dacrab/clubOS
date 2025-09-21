<script lang="ts">
import Eye from "@lucide/svelte/icons/eye";
import EyeOff from "@lucide/svelte/icons/eye-off";
import Monitor from "@lucide/svelte/icons/monitor";
import Moon from "@lucide/svelte/icons/moon";
import Sun from "@lucide/svelte/icons/sun";
import { toast } from "svelte-sonner";
import { env as publicEnv } from "$env/dynamic/public";
import Button from "$lib/components/ui/button/button.svelte";
import Card from "$lib/components/ui/card/card.svelte";
import CardContent from "$lib/components/ui/card/card-content.svelte";
import Input from "$lib/components/ui/input/input.svelte";
import Label from "$lib/components/ui/label/label.svelte";
import { locale, t } from "$lib/i18n";
import { supabase } from "$lib/supabaseClient";

let username = $state("");
let password = $state("");
let loading = $state(false);
let redirecting = $state(false);
let errorMessage = $state("");
let showPassword = $state(false);
const seededUsers: Array<{
  label: string;
  email: string;
  username: string;
  password: string;
}> = [
  {
    label: "Admin",
    email: "admin@example.com",
    username: "admin",
    password: "admin123",
  },
  {
    label: "Staff",
    email: "staff@example.com",
    username: "staff",
    password: "staff123",
  },
  {
    label: "Secretary",
    email: "secretary@example.com",
    username: "secretary",
    password: "secretary123",
  },
];

function quickFill(emailOrUsername: string, pwd: string) {
  // Allow either username or full email for convenience
  username = emailOrUsername;
  password = pwd;
}

// Theme & language controls (login page)
type ThemeChoice = "light" | "dark" | "system";
let themeChoice = $state<ThemeChoice>("system");

function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const resolved =
    choice === "system" ? (mq.matches ? "dark" : "light") : choice;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

$effect(() => {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem("theme");
  if (stored === "light" || stored === "dark" || stored === "system")
    themeChoice = stored as ThemeChoice;
  else themeChoice = "system";
  applyTheme(themeChoice);

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (themeChoice === "system") applyTheme("system");
  };
  mq.addEventListener?.("change", onChange);
  return () => mq.removeEventListener?.("change", onChange);
});

function setTheme(choice: ThemeChoice) {
  themeChoice = choice;
  try {
    window.localStorage.setItem("theme", choice);
  } catch {
    /* ignore */
  }
  applyTheme(choice);
}

async function signIn(e?: Event) {
  e?.preventDefault();
  errorMessage = "";
  if (!(username && password)) {
    errorMessage = t("login.usernamePlaceholder");
    toast.error(errorMessage);
    return;
  }
  // Allow username to work as a full email too
  const email = username.includes("@")
    ? username
    : `${username}@${publicEnv.PUBLIC_LOGIN_EMAIL_DOMAIN ?? "example.com"}`;
  loading = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      errorMessage = error.message;
      toast.error(t("login.error"));
      return;
    }
    toast.success(t("login.success"));
    redirecting = true;
    // Give the overlay a moment to render/animate before navigation
    const REDIRECT_DELAY_MS = 400;
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, REDIRECT_DELAY_MS);
  } catch (err) {
    toast.error(t("login.error"));
  } finally {
    loading = false;
  }
}
</script>

<div class="min-h-screen flex items-center justify-center px-4 bg-grid">
  {#if redirecting}
    <div class="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
      <div class="flex flex-col items-center gap-4 p-6 rounded-xl border glass animate-in fade-in zoom-in duration-300">
        <div class="relative w-10 h-10">
          <div class="absolute inset-0 rounded-full border-2 border-primary/30"></div>
          <div class="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
        </div>
        <div class="text-sm text-muted-foreground flex items-center gap-2">
          <Monitor class="w-4 h-4" /> {t('dashboard.loading')}
        </div>
      </div>
    </div>
  {/if}
  <!-- Quick Controls: language & theme -->
  <div class="fixed top-4 right-4 flex items-center gap-2">
    <!-- Language switch -->
    <div class="inline-flex items-center gap-1 rounded-md border p-0.5 h-9 bg-card">
      <button
        type="button"
        class={`${$locale==='en' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} px-2 h-8 rounded text-xs`}
        aria-pressed={$locale==='en'}
        onclick={() => { locale.set('en'); }}
      >EN</button>
      <button
        type="button"
        class={`${$locale==='el' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} px-2 h-8 rounded text-xs`}
        aria-pressed={$locale==='el'}
        onclick={() => { locale.set('el'); }}
      >EL</button>
    </div>

    <!-- Theme switch: system / light / dark -->
    <div class="inline-flex items-center gap-1 rounded-md border p-0.5 h-9 bg-card">
      <button
        type="button"
        class={`${themeChoice==='system' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} px-2 h-8 rounded text-xs inline-flex items-center gap-1`}
        aria-pressed={themeChoice==='system'}
        onclick={() => setTheme('system')}
      ><Monitor class="w-3.5 h-3.5" /> {t('theme.system')}</button>
      <button
        type="button"
        class={`${themeChoice==='light' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} px-2 h-8 rounded text-xs inline-flex items-center gap-1`}
        aria-pressed={themeChoice==='light'}
        onclick={() => setTheme('light')}
      ><Sun class="w-3.5 h-3.5" /> {t('theme.light')}</button>
      <button
        type="button"
        class={`${themeChoice==='dark' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'} px-2 h-8 rounded text-xs inline-flex items-center gap-1`}
        aria-pressed={themeChoice==='dark'}
        onclick={() => setTheme('dark')}
      ><Moon class="w-3.5 h-3.5" /> {t('theme.dark')}</button>
    </div>
  </div>

  <div class="w-full max-w-md space-y-8">
    <!-- Logo and Title -->
    <div class="text-center space-y-4">
      <div class="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary mb-4">
        <span class="text-primary-foreground font-semibold text-lg">C</span>
      </div>
      <div>
        <h1 class="text-2xl font-semibold">{t('login.title')}</h1>
        <p class="text-muted-foreground">{t('login.subtitle')}</p>
      </div>
    </div>

    <!-- Login Form -->
    <Card>
      <CardContent class="p-6">
        <form onsubmit={signIn} class="space-y-4">
          <!-- Quick fill seeded users -->
          <div class="flex gap-2 flex-wrap">
            {#each seededUsers as u}
              <button type="button" class="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs"
                onclick={() => quickFill(u.email, u.password)}
                aria-label={`Use ${u.label} user`}>
                {u.label}
              </button>
            {/each}
          </div>

          <div class="space-y-2">
            <Label>{t('login.usernameLabel')}</Label>
            <Input
              placeholder={t('login.usernamePlaceholder')}
              bind:value={username}
              autocomplete="username"
            />
          </div>

          <div class="space-y-2">
            <Label>{t('login.passwordLabel')}</Label>
            <div class="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.passwordPlaceholder')}
                bind:value={password}
                autocomplete="current-password"
                class="pr-10"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                onclick={() => (showPassword = !showPassword)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {#if showPassword}
                  <EyeOff class="size-4" />
                {:else}
                  <Eye class="size-4" />
                {/if}
              </button>
            </div>
          </div>

          {#if errorMessage}
            <p class="text-sm text-destructive">{errorMessage}</p>
          {/if}

          <Button
            type="submit"
            class="w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {#if loading}
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                {t('login.loading')}
              </div>
            {:else}
              {t('login.submit')}
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
