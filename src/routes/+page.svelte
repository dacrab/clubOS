<script lang="ts">
import Eye from "@lucide/svelte/icons/eye";
import EyeOff from "@lucide/svelte/icons/eye-off";
import Monitor from "@lucide/svelte/icons/monitor";
import { toast } from "svelte-sonner";
import { env as publicEnv } from "$env/dynamic/public";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent } from "$lib/components/ui/card";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
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
  username = emailOrUsername;
  password = pwd;
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

<div class="min-h-screen flex items-center justify-center px-4">
  {#if redirecting}
    <div class="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
      <div class="flex items-center gap-2 p-3 rounded-md border bg-card text-sm text-muted-foreground">
        <Monitor class="w-4 h-4" /> {t('dashboard.loading')}
      </div>
    </div>
  {/if}
  <!-- Language switch -->
  <div class="fixed top-4 right-4">
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
          <!-- Quick login -->
          <div class="space-y-2">
            <p class="text-xs text-muted-foreground">{t('login.quickLogin')}</p>
            <div class="flex gap-2 flex-wrap">
              {#each seededUsers as u}
                <button
                  type="button"
                  class="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs"
                  onclick={() => quickFill(u.email, u.password)}
                  aria-label={`Use ${u.label} user`}
                >
                  {u.label}
                </button>
              {/each}
            </div>
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
              {t('login.loading')}
            {:else}
              {t('login.submit')}
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
