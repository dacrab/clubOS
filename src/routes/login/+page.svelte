<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { t } from '$lib/i18n';
  import { env as publicEnv } from '$env/dynamic/public';

  let username = '';
  let password = '';
  let loading = false;
  let errorMessage = '';

  async function signIn() {
    errorMessage = '';
    if (!username || !password) {
      errorMessage = 'Missing credentials';
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

<div class="max-w-sm m-auto p-6">
  <h1 class="text-xl mb-4">{t('login.title')}</h1>
  <form on:submit|preventDefault={signIn} class="flex flex-col gap-3">
    <input class="border rounded p-2" placeholder="username" bind:value={username} autocomplete="username" />
    <input class="border rounded p-2" placeholder="password" type="password" bind:value={password} autocomplete="current-password" />
    {#if errorMessage}
      <p class="text-red-600 text-sm">{errorMessage}</p>
    {/if}
    <button class="border rounded p-2" disabled={loading}>
      {loading ? '...' : t('login.submit')}
    </button>
  </form>
  <p class="mt-2 text-xs text-gray-500">Domain is auto-applied. Example: admin → admin@domain</p>
</div>


