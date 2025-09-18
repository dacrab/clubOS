<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { t } from '$lib/i18n';
  import { env as publicEnv } from '$env/dynamic/public';

  let code = '';
  let loading = false;
  let errorMessage = '';

  async function signIn() {
    errorMessage = '';
    const [localPart, password] = code.split('-');
    if (!localPart || !password) {
      errorMessage = 'Invalid code format';
      return;
    }
    const domain = publicEnv.PUBLIC_LOGIN_EMAIL_DOMAIN ?? 'example.com';
    const email = `${localPart}@${domain}`;
    loading = true;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    loading = false;
    if (error) {
      errorMessage = error.message;
      return;
    }
    window.location.href = '/orders';
  }
</script>

<div class="max-w-sm m-auto p-6">
  <h1 class="text-xl mb-4">{t('login.title')}</h1>
  <form on:submit|preventDefault={signIn} class="flex flex-col gap-3">
    <input class="border rounded p-2" placeholder={t('login.placeholder')} bind:value={code} />
    {#if errorMessage}
      <p class="text-red-600 text-sm">{errorMessage}</p>
    {/if}
    <button class="border rounded p-2" disabled={loading}>
      {loading ? '...' : t('login.submit')}
    </button>
  </form>
  <p class="mt-2 text-xs text-gray-500">Format: local-part-password. Domain is auto-applied.</p>
</div>


