<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import Card from '$lib/components/ui/card/card.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import CardDescription from '$lib/components/ui/card/card-description.svelte';
  import CardFooter from '$lib/components/ui/card/card-footer.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import Label from '$lib/components/ui/label/label.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { t } from '$lib/i18n';
  import { env as publicEnv } from '$env/dynamic/public';
  import { toast } from 'svelte-sonner';
  import Eye from '@lucide/svelte/icons/eye';
  import EyeOff from '@lucide/svelte/icons/eye-off';

  let username = $state('');
  let password = $state('');
  let loading = $state(false);
  let errorMessage = $state('');
  let showPassword = $state(false);

  async function signIn(e?: Event) {
    e?.preventDefault();
    errorMessage = '';
    if (!username || !password) {
      errorMessage = t('login.usernamePlaceholder');
      toast.error(errorMessage);
      return;
    }
    const domain = publicEnv.PUBLIC_LOGIN_EMAIL_DOMAIN ?? 'example.com';
    const email = `${username}@${domain}`;
    loading = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        errorMessage = error.message;
        toast.error(t('login.error'));
        return;
      }
      toast.success(t('login.success'));
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(t('login.error'));
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center px-4 py-8">
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

    <!-- Footer -->
    <div class="text-center">
      <p class="text-xs text-muted-foreground">
        {t('login.domainNote')}
      </p>
    </div>
  </div>
</div>
