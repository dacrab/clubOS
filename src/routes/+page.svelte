<script lang="ts">
  // redirect root to orders or login based on session
  import { supabase } from '$lib/supabaseClient';

  $effect(() => {
    supabase.auth.getSession().then((result: { data: { session: any } }) => {
      if (result.data.session) window.location.href = '/orders';
      else window.location.href = '/login';
    });
  });
</script>

<p>Loading...</p>
