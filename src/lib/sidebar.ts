import { writable } from "svelte/store";

// Global store for sidebar collapsed state so layout and sidebar stay in sync
export const sidebarCollapsed = writable<boolean>(false);

// Animation coordination flags and tokens
export const sidebarAnimating = writable<boolean>(false);

export const SIDEBAR_DIMENSIONS = {
	expanded: "16rem",
	collapsed: "4rem",
} as const;

export const SIDEBAR_ANIMATION = {
	durationMs: 200,
	easing: "ease-in-out",
} as const;
