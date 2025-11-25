<script lang="ts">
import { BarChart3, ClipboardList, LogOut, Package, ShoppingCart, UserCog } from "@lucide/svelte";
import { toast } from "svelte-sonner";
import LowStockCard from "$lib/components/features/low-stock-card.svelte";
import NewSaleDialog from "$lib/components/features/new-sale-dialog.svelte";
import RecentOrders from "$lib/components/features/recent-orders.svelte";
import Button from "$lib/components/ui/button/button.svelte";
import PageContent from "$lib/components/ui/page/page-content.svelte";
import PageHeader from "$lib/components/ui/page/page-header.svelte";
import { facilityState } from "$lib/state/facility.svelte";
import { tt as t } from "$lib/state/i18n.svelte";
import { registerState } from "$lib/state/register.svelte";
import { salesState } from "$lib/state/sales.svelte";
import { supabase } from "$lib/utils/supabase";

((..._args: unknown[]) => {
	return;
})(
	BarChart3,
	ClipboardList,
	LogOut,
	Package,
	ShoppingCart,
	UserCog,
	PageContent,
	PageHeader,
	LowStockCard,
	NewSaleDialog,
	RecentOrders,
	Button,
	t,
);

let showSale = $state(false);
let closing = $state(false);
const productsForSale: Array<{
	id: string;
	name: string;
	price: number;
	category_id?: string | null;
}> = $state([]);

$effect(() => {
	if (typeof window === "undefined") {
		return;
	}
	notifyLowStock();
});

async function notifyLowStock() {
	const THRESHOLD = 3;
	const SAMPLE = 5;
	const { data: sessionData } = await supabase.auth.getUser();
	const uid = sessionData.user?.id ?? "";
	const { data: tm } = await supabase
		.from("tenant_members")
		.select("tenant_id")
		.eq("user_id", uid)
		.limit(1);
	const tenantId = (tm?.[0]?.tenant_id as string | undefined) ?? null;
	const facilityId = await facilityState.resolveSelected();
	let q = supabase
		.from("products")
		.select("name, stock_quantity")
		.lte("stock_quantity", THRESHOLD)
		.neq("stock_quantity", -1)
		.order("stock_quantity", { ascending: true });
	if (tenantId) q = q.eq("tenant_id", tenantId);
	if (facilityId) q = q.eq("facility_id", facilityId);
	const { data } = await q.limit(SAMPLE);
	const low = (data as Array<{ name: string; stock_quantity: number }> | null) ?? [];
	if (low.length > 0) {
		const names = low.map((item) => `${item.name} (${item.stock_quantity})`).join(", ");
		toast.warning(`Low stock: ${names}`);
	}
}

async function onCloseRegister() {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;
	const sessionId = await registerState.ensureOpenSession(user.id);
	closing = true;
	try {
		await registerState.close(sessionId, null);
	} finally {
		closing = false;
	}
}

async function createSale(payload: {
	items: Array<{
		id: string;
		name: string;
		price: number;
		is_treat?: boolean;
	}>;
	paymentMethod: "cash";
	couponCount: number;
}) {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return;
	await salesState.create(user.id, payload);
}

// remove capturing IIFE that referenced reactive state once; all symbols are used in markup
</script>

<PageContent>
	<PageHeader
		title={t("dashboard.admin.title")}
		subtitle={t("admin.overview")}
	>
		<Button
			type="button"
			class="rounded-md gap-2"
			onclick={() => (showSale = true)}
		>
			<ShoppingCart class="h-4 w-4" />
			{t("orders.new")}
		</Button>
		<Button href="/admin/settings" variant="outline" class="rounded-md">
			{t("nav.settings")}
		</Button>
	</PageHeader>

	<div class="grid gap-8 lg:grid-cols-[3fr_2fr]">
		<section class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold tracking-tight">
					{t("orders.recent")}
				</h2>
				<Button
					variant="ghost"
					size="sm"
					class="text-muted-foreground hover:text-primary"
					href="/admin/orders"
				>
					{t("common.viewAll")}
				</Button>
			</div>
			<div class="rounded-xl border bg-card shadow-sm">
				<div class="p-6">
					<RecentOrders limit={5} />
				</div>
			</div>
		</section>

		<aside class="flex flex-col gap-8">
			<div class="space-y-4">
				<h2 class="text-lg font-semibold tracking-tight">{t("inventory.lowStock.title")}</h2>
				<div class="rounded-xl border bg-card shadow-sm overflow-hidden">
					<LowStockCard threshold={10} />
				</div>
			</div>

			<div class="space-y-4">
				<h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">
					{t("common.actions")}
				</h3>
				<div class="grid gap-2">
					<Button
						href="/admin/products"
						variant="outline"
						class="justify-start gap-3 h-11"
					>
						<Package class="h-4 w-4 text-muted-foreground" />
						{t("nav.products")}
					</Button>
					<Button
						href="/admin/users"
						variant="outline"
						class="justify-start gap-3 h-11"
					>
						<UserCog class="h-4 w-4 text-muted-foreground" />
						{t("nav.users")}
					</Button>
					<Button
						href="/admin/registers"
						variant="outline"
						class="justify-start gap-3 h-11"
					>
						<ClipboardList class="h-4 w-4 text-muted-foreground" />
						{t("dashboard.admin.manageRegisters")}
					</Button>
				</div>
				
				<div class="pt-4">
					<Button
						type="button"
						onclick={onCloseRegister}
						disabled={closing}
						variant="destructive"
						class="w-full justify-center gap-2"
					>
						<LogOut class="h-4 w-4" />
						{closing
							? t("dashboard.admin.closing")
							: t("dashboard.admin.closeRegister")}
					</Button>
				</div>
			</div>
		</aside>
	</div>

	<NewSaleDialog
		bind:open={showSale}
		products={productsForSale}
		onSubmit={createSale}
	/>
</PageContent>
