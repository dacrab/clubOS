<script lang="ts">
  import { supabase } from '$lib/supabaseClient';
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui';
  const DropdownMenu = DropdownMenuPrimitive.Root;
  import DropdownMenuContent from '$lib/components/ui/dropdown-menu/dropdown-menu-content.svelte';
  import DropdownMenuItem from '$lib/components/ui/dropdown-menu/dropdown-menu-item.svelte';
  import DropdownMenuTrigger from '$lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import CardContent from '$lib/components/ui/card/card-content.svelte';
  import CardHeader from '$lib/components/ui/card/card-header.svelte';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import { t } from '$lib/i18n';
  import { Printer, Receipt, Eye } from '@lucide/svelte';

  const __props = $props<{ limit?: number }>();
  let { limit = 5 } = __props;

  type OrderItem = {
    id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    is_treat: boolean;
    product: {
      id: string;
      name: string;
      price: number;
    };
  };

  type OrderDetails = {
    id: string;
    total_amount: number;
    subtotal: number;
    discount_amount: number;
    payment_method: 'cash' | 'card' | 'treat';
    card_discounts_applied: number;
    created_at: string;
    items: OrderItem[];
  };

  let orders: OrderDetails[] = $state([]);
  let selectedOrder: OrderDetails | null = $state(null);

  async function load() {
    const { data } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        subtotal,
        discount_amount,
        payment_method,
        card_discounts_applied,
        created_at,
        order_items (
          id,
          quantity,
          unit_price,
          line_total,
          is_treat,
          products (
            id,
            name,
            price
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    orders = (data as any)?.map((order: any) => ({
      ...order,
      items: order.order_items?.map((item: any) => ({
        ...item,
        product: item.products
      })) || []
    })) ?? [];
  }

  async function printReceipt(order: OrderDetails) {
    // Implementation for printing receipt
    console.log('Printing receipt for order:', order.id);
  }

  function showOrderDetails(order: OrderDetails) {
    selectedOrder = order;
  }

  $effect(() => { load(); });
</script>

{#if orders.length === 0}
  <div class="text-sm text-muted-foreground">{t('orders.none')}</div>
{:else}
  <div class="space-y-3">
    {#each orders as order}
      <div class="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-xs text-muted-foreground">#{order.id.slice(0,8)}</span>
            <span class="text-sm font-semibold">€{Number(order.total_amount).toFixed(2)}</span>
            <span class="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary capitalize">
              {order.payment_method}
            </span>
          </div>
          <div class="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            {order.items.length} items • {order.items.filter(i => i.is_treat).length} treats
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
              <Eye class="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent class="w-80">
            <div class="p-4">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <h4 class="font-semibold">Order #{order.id.slice(0,8)}</h4>
                  <span class="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </span>
                </div>

                <div class="space-y-2">
                  <h5 class="font-medium text-sm">Items</h5>
                  {#each order.items as item}
                    <div class="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                      <div class="flex items-center gap-2">
                        <span class="font-medium">{item.product.name}</span>
                        <span class="text-xs text-muted-foreground">×{item.quantity}</span>
                        {#if item.is_treat}
                          <span class="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">Free</span>
                        {/if}
                      </div>
                      <span class="font-medium">€{Number(item.line_total).toFixed(2)}</span>
                    </div>
                  {/each}
                </div>

                <div class="border-t pt-3 space-y-1">
                  <div class="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>€{Number(order.subtotal).toFixed(2)}</span>
                  </div>
                  {#if order.discount_amount > 0}
                    <div class="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-€{Number(order.discount_amount).toFixed(2)}</span>
                    </div>
                  {/if}
                  <div class="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>€{Number(order.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                <div class="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => printReceipt(order)}
                    class="flex-1"
                  >
                    <Printer class="h-3 w-3 mr-1" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => showOrderDetails(order)}
                    class="flex-1"
                  >
                    <Receipt class="h-3 w-3 mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    {/each}
  </div>
{/if}


