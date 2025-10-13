<script lang="ts">
import { X } from "@lucide/svelte";
import {
  Dialog as DialogPrimitive,
  Dialog as DialogPrimitiveNS,
} from "bits-ui";
import type { Snippet } from "svelte";
import type { WithoutChildrenOrChild } from "$lib/utils";
import { cn } from "$lib/utils";
import DialogOverlay from "./dialog-overlay.svelte";

const DialogPortal = DialogPrimitiveNS.Portal;

let {
  ref = $bindable(null),
  class: className,
  portalProps,
  children,
  showCloseButton = true,
  size = "md",
  ...restProps
}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
  portalProps?: DialogPrimitive.PortalProps;
  children: Snippet;
  showCloseButton?: boolean;
  size?: "md" | "xl" | "fullscreen";
} = $props();
((..._args: unknown[]) => {
  return;
})(
  X,
  DialogPrimitive,
  cn,
  DialogOverlay,
  DialogPortal,
  ref,
  className,
  portalProps,
  children,
  showCloseButton,
  size,
  restProps
);
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			"bg-surface data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200",
			// size variants
			size === 'md' && 'sm:max-w-lg',
			size === 'xl' && 'sm:max-w-3xl',
			size === 'fullscreen' && 'w-[95vw] max-w-[95vw] h-[90vh] overflow-hidden',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close
				class="ring-offset-background focus:ring-ring rounded-xs focus:outline-hidden absolute end-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
			>
				<X />
				<span class="sr-only">Close</span>
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
