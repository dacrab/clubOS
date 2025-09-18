<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { t } from '$lib/i18n';
  import { env as publicEnv } from '$env/dynamic/public';
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
  import Input from '$lib/components/ui/input/input.svelte';
  import Label from '$lib/components/ui/label/label.svelte';
  import Button from '$lib/components/ui/button/button.svelte';

  let username = '';
  let password = '';
  let loading = false;
  let errorMessage = '';

  async function signIn(e?: Event) {
    e?.preventDefault();
    errorMessage = '';
    if (!username || !password) {
      errorMessage = t('login.usernamePlaceholder');
      return;
    }
    const domain = publicEnv.PUBLIC_LOGIN_EMAIL_DOMAIN ?? 'example.com';
    const email = `${username}@${domain}`;
    loading = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    loading = false;
    if (error) {
      errorMessage = error.message;
      return;
    }
    window.location.href = '/dashboard';
  }
</script>

<div class="min-h-[70vh] grid place-items-center px-4">
  <Card class="w-full max-w-sm">
    <CardHeader class="text-center">
      <CardTitle>{t('login.title')}</CardTitle>
      <CardDescription>{t('login.subtitle')}</CardDescription>
    </CardHeader>
    <form onsubmit={signIn}>
      <CardContent class="grid gap-4">
        <div class="grid gap-2">
          <Label for="username">{t('login.usernameLabel')}</Label>
          <Input id="username" placeholder={t('login.usernamePlaceholder')} bind:value={username} autocomplete="username" />
        </div>
        <div class="grid gap-2">
          <Label for="password">{t('login.passwordLabel')}</Label>
          <Input id="password" type="password" placeholder={t('login.passwordPlaceholder')} bind:value={password} autocomplete="current-password" />
        </div>
        {#if errorMessage}
          <div class="text-red-500 text-sm">{errorMessage}</div>
        {/if}
      </CardContent>
      <CardFooter class="flex flex-col gap-2">
        <Button class="w-full" disabled={loading}>{loading ? '...' : t('login.submit')}</Button>
        <p class="text-xs text-center text-muted-foreground">{t('login.domainNote')}</p>
      </CardFooter>
    </form>
  </Card>
</div>
