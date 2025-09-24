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

<div class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
  <div class="pointer-events-none absolute inset-0 -z-10 select-none bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_60%)]"></div>

  {#if redirecting}
    <div class="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
      <div class="flex items-center gap-2 rounded-full border border-outline-soft bg-surface px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <Monitor class="h-4 w-4" /> {t("dashboard.loading")}
      </div>
    </div>
  {/if}

  <div class="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-outline-soft bg-surface px-1 py-1 text-xs shadow-sm">
    <button
      type="button"
      class={`${
        $locale === "en"
          ? "rounded-full bg-primary px-3 py-1 text-white"
          : "rounded-full px-3 py-1 text-muted-foreground"
      } transition-colors`}
      aria-pressed={$locale === "en"}
      onclick={() => {
        locale.set("en");
      }}
    >
      EN
    </button>
    <button
      type="button"
      class={`${
        $locale === "el"
          ? "rounded-full bg-primary px-3 py-1 text-white"
          : "rounded-full px-3 py-1 text-muted-foreground"
      } transition-colors`}
      aria-pressed={$locale === "el"}
      onclick={() => {
        locale.set("el");
      }}
    >
      EL
    </button>
  </div>

  <div class="mx-auto w-full max-w-sm space-y-8">
    <div class="flex flex-col items-center gap-6 text-center">
      <span class="grid size-16 place-items-center rounded-3xl bg-primary/10 text-2xl font-semibold text-primary">
        CO
      </span>
      <div class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">
          {t("login.title")}
        </h1>
        <p class="text-sm text-muted-foreground">{t("login.subtitle")}</p>
      </div>
    </div>

    <Card class="rounded-3xl border border-outline-soft bg-surface/80 shadow-xl backdrop-blur">
      <CardContent class="p-8">
        <form onsubmit={signIn} class="flex flex-col gap-5">
          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("login.quickLogin")}
            </p>
            <div class="flex flex-wrap gap-2">
              {#each seededUsers as userSeed}
                <button
                  type="button"
                  class="rounded-full border border-outline-soft bg-surface px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  onclick={() => quickFill(userSeed.email, userSeed.password)}
                  aria-label={`Use ${userSeed.label} user`}
                >
                  {userSeed.label}
                </button>
              {/each}
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <Label class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("login.usernameLabel")}
            </Label>
            <Input
              placeholder={t("login.usernamePlaceholder")}
              bind:value={username}
              autocomplete="username"
              class="rounded-xl border-outline-soft bg-background"
            />
          </div>

          <div class="flex flex-col gap-2">
            <Label class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t("login.passwordLabel")}
            </Label>
            <div class="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("login.passwordPlaceholder")}
                bind:value={password}
                autocomplete="current-password"
                class="rounded-xl border-outline-soft bg-background pr-11"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                onclick={() => (showPassword = !showPassword)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            class="h-12 rounded-full text-sm font-semibold"
            disabled={loading}
            aria-busy={loading}
          >
            {#if loading}
              {t("login.loading")}
            {:else}
              {t("login.submit")}
            {/if}
          </Button>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
