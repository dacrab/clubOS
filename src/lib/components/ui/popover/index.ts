import { Popover as PopoverPrimitive } from "bits-ui";

const Root = PopoverPrimitive.Root;
const Trigger = PopoverPrimitive.Trigger;

export {
	Root,
	Trigger,
	Root as Popover,
	Trigger as PopoverTrigger,
};
export { default as PopoverContent } from "./popover-content.svelte";
