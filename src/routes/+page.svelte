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

<div class="min-h-[70vh] grid place-items-center px-4">
  <Card class="w-full max-w-sm">
    <CardHeader class="text-center space-y-1.5">
      <CardTitle>{t('login.title')}</CardTitle>
      <CardDescription>{t('login.subtitle')}</CardDescription>
    </CardHeader>
    <form onsubmit={signIn}>
      <CardContent class="grid gap-6">
        <div class="grid gap-3">
          <Label for="username">{t('login.usernameLabel')}</Label>
          <Input id="username" placeholder={t('login.usernamePlaceholder')} bind:value={username} autocomplete="username" />
        </div>
        <div class="grid gap-3">
          <Label for="password">{t('login.passwordLabel')}</Label>
          <div class="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'} placeholder={t('login.passwordPlaceholder')} bind:value={password} autocomplete="current-password" class="pr-10" />
            <button type="button" class="absolute inset-y-0 right-2 my-auto text-sm text-muted-foreground hover:text-foreground" onclick={() => (showPassword = !showPassword)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        {#if errorMessage}
          <div class="text-red-500 text-sm">{errorMessage}</div>
        {/if}
      </CardContent>
      <CardFooter class="flex flex-col gap-3">
        <Button type="submit" class="w-full" disabled={loading} aria-busy={loading}>{loading ? t('login.loading') : t('login.submit')}</Button>
        <p class="text-xs text-center text-muted-foreground">{t('login.domainNote')}</p>
      </CardFooter>
    </form>
  </Card>
</div>
