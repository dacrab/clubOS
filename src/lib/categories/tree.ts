export type Category = {
	id: string;
	parent_id: string | null;
};

export function collectWithDescendants(
	categories: readonly Category[],
	rootId: string,
): Set<string> {
	const result = new Set<string>([rootId]);
	const childrenByParent = new Map<string, string[]>();
	for (const c of categories) {
		if (!c.parent_id) {
			continue;
		}
		const list = childrenByParent.get(c.parent_id) ?? [];
		list.push(c.id);
		childrenByParent.set(c.parent_id, list);
	}

	const stack: string[] = [rootId];
	while (stack.length) {
		const pid = stack.pop() as string;
		const kids = childrenByParent.get(pid) ?? [];
		for (const id of kids) {
			if (!result.has(id)) {
				result.add(id);
				stack.push(id);
			}
		}
	}
	return result;
}
