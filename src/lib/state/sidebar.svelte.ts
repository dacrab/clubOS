export const SIDEBAR_DIMENSIONS = {
	expanded: "16rem",
	collapsed: "4rem",
} as const;

export const SIDEBAR_ANIMATION = {
	durationMs: 200,
	easing: "ease-in-out",
} as const;

class SidebarState {
	collapsed = $state(false);
	animating = $state(false);
}

export const sidebarState = new SidebarState();
