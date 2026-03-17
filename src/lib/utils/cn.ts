import { twMerge } from "tailwind-merge";

// cn: merge Tailwind classes, resolving conflicts (e.g. p-2 + p-4 → p-4)
// clsx removed — all call sites pass plain strings/ternaries, not arrays or objects
export function cn(...inputs: (string | undefined | null | false)[]): string {
	return twMerge(inputs.filter(Boolean).join(" "));
}
