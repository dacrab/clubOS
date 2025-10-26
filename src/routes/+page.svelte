<script lang="ts">
import { Eye, EyeOff, Lock } from "@lucide/svelte";
import { toast } from "svelte-sonner";
import { goto } from "$app/navigation";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent } from "$lib/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "$lib/components/ui/dropdown-menu";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { t } from "$lib/i18n";
import { supabase } from "$lib/supabase-client";

let email = $state("");
let password = $state("");
let loading = $state(false);
let errorMessage = $state("");
let showPassword = $state(false);

const seededUsers = [
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

const roleToPath = {
	admin: "/admin",
	staff: "/staff",
	secretary: "/secretary",
};

function quickFill(emailAddr: string, pwd: string) {
	email = emailAddr;
	password = pwd;
}

async function resolveRedirectTarget(): Promise<string> {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return "/";
	}

	const metaRole = user.user_metadata?.["role"] as
		| keyof typeof roleToPath
		| undefined;
	if (metaRole && roleToPath[metaRole]) {
		return roleToPath[metaRole];
	}

	try {
		const { data: profile } = await supabase
			.from("users")
			.select("role")
			.eq("id", user.id)
			.maybeSingle();

		const role = profile?.role as keyof typeof roleToPath;
		return role ? (roleToPath[role] ?? "/") : "/";
	} catch {
		return "/";
	}
}

async function signIn(e?: Event) {
	e?.preventDefault();
	errorMessage = "";

	if (!(email && password)) {
		errorMessage = t("login.missingCredentials");
		toast.error(errorMessage);
		return;
	}

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
		const target = await resolveRedirectTarget();
		await goto(target);
	} catch {
		toast.error(t("login.error"));
	} finally {
		loading = false;
	}
}

async function sendResetEmail() {
	errorMessage = "";

	if (!email) {
		toast.error(t("login.enterEmailFirst"));
		return;
	}

	try {
		const origin = typeof window !== "undefined" ? window.location.origin : "";
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${origin}/reset`,
		});

		if (error) {
			toast.error(error.message);
			return;
		}

		toast.success(t("login.resetEmailSent"));
	} catch {
		toast.error(t("login.resetEmailFailed"));
	}
}
</script>

<div class="relative flex flex-col items-center bg-background px-4">
  <div
    class="pointer-events-none absolute inset-0 -z-10 select-none bg-[radial-gradient(circle_at_top,_rgba(94,99,255,0.12),_transparent_55%)]"
  ></div>

  <div class="mx-auto w-full max-w-md space-y-10">
    <div class="flex flex-col items-center gap-5 text-center">
      <span
        class="grid size-14 place-items-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary"
      >
        CO
      </span>
      <div class="space-y-1.5">
        <h1 class="text-3xl font-semibold tracking-tight text-foreground">
          {t("login.title")}
        </h1>
        <p class="text-sm text-muted-foreground">{t("login.subtitle")}</p>
      </div>
    </div>

    <Card
      class="rounded-2xl border border-outline-soft/70 bg-surface-strong/80 shadow-md backdrop-blur"
    >
      <CardContent class="space-y-6 p-8">
        <div class="flex flex-col gap-4">
          <div
            class="flex items-center gap-3 rounded-full border border-outline-soft/80 bg-background/90 p-1 text-xs font-medium text-muted-foreground"
          >
            <Lock
              class="ml-2 size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <div class="flex flex-1 items-center justify-between gap-1">
              <span class="text-[12px] text-muted-foreground/90"
                >{t("login.quickLogin")}</span
              >
              <DropdownMenu>
                <DropdownMenuTrigger
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("login.seeded")}
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-40 rounded-xl">
                  {#each seededUsers as userSeed}
                    <DropdownMenuItem
                      onclick={() =>
                        quickFill(userSeed.email, userSeed.password)}
                    >
                      <div class="flex flex-col">
                        <span class="text-sm font-medium text-foreground"
                          >{userSeed.label}</span
                        >
                        <span class="text-xs text-muted-foreground"
                          >{userSeed.username}</span
                        >
                      </div>
                    </DropdownMenuItem>
                  {/each}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <form onsubmit={signIn} class="flex flex-col gap-5">
          <div class="space-y-2">
            <Label class="text-[13px] font-medium text-muted-foreground/90">
              {t("login.emailLabel")}
            </Label>
            <Input
              placeholder={t("login.emailPlaceholder")}
              bind:value={email}
              type="email"
              autocomplete="email"
              class="h-12 rounded-xl border-outline-soft bg-background/90 text-sm"
            />
          </div>

          <div class="space-y-2">
            <Label class="text-[13px] font-medium text-muted-foreground/90">
              {t("login.passwordLabel")}
            </Label>
            <div class="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("login.passwordPlaceholder")}
                bind:value={password}
                autocomplete="current-password"
                class="h-12 rounded-xl border-outline-soft bg-background/90 pr-11 text-sm"
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
            class="h-12 rounded-xl text-sm font-semibold"
            disabled={loading}
            aria-busy={loading}
          >
            {#if loading}
              {t("login.loading")}
            {:else}
              {t("login.submit")}
            {/if}
          </Button>

          <button
            type="button"
            class="text-sm text-primary underline-offset-4 hover:underline"
            onclick={sendResetEmail}
          >
            {t("login.forgotPassword")}
          </button>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
