export type WindowConfig = {
	rowHeight: number;
	viewBufferRows: number;
	viewportHeight: number;
};

export function computeWindow(
	scrollTop: number,
	totalRows: number,
	cfg: WindowConfig,
): { startIndex: number; endIndex: number } {
	const { rowHeight, viewBufferRows, viewportHeight } = cfg;
	const visibleCount = Math.ceil(viewportHeight / rowHeight) + viewBufferRows;
	const first = Math.max(
		0,
		Math.floor(scrollTop / rowHeight) - Math.ceil(viewBufferRows / 2),
	);
	const startIndex = first;
	const endIndex = Math.min(totalRows, first + visibleCount);
	return { startIndex, endIndex };
}

export function computePadding(
	startIndex: number,
	endIndex: number,
	totalRows: number,
	rowHeight: number,
): { topPad: number; bottomPad: number } {
	const topPad = startIndex * rowHeight;
	const bottomPad = Math.max(0, (totalRows - endIndex) * rowHeight);
	return { topPad, bottomPad };
}
