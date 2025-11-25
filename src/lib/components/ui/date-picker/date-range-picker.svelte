<script lang="ts">
import { DateRangePicker as DateRangePickerPrimitive } from "bits-ui";
import { CalendarIcon, ChevronLeft, ChevronRight } from "@lucide/svelte";
import {
	getLocalTimeZone,
	today,
	parseDate,
	type DateValue,
} from "@internationalized/date";
import { cn } from "$lib/utils/utils";
import { Button } from "$lib/components/ui/button";
import { tt as t, type TranslationKey } from "$lib/state/i18n.svelte";

type DateRange = { start: DateValue; end: DateValue };
type PresetId = "all" | "today" | "yesterday" | "last7" | "last30";

let {
	start = $bindable(""),
	end = $bindable(""),
	class: className = "",
	onchange,
}: {
	start: string;
	end: string;
	class?: string;
	onchange?: () => void;
} = $props();

const presets: { id: PresetId; labelKey: TranslationKey }[] = [
	{ id: "all", labelKey: "date.all" },
	{ id: "today", labelKey: "date.today" },
	{ id: "yesterday", labelKey: "date.yesterday" },
	{ id: "last7", labelKey: "date.last7" },
	{ id: "last30", labelKey: "date.last30" },
];

function todayDate(): DateValue {
	return today(getLocalTimeZone());
}

function shiftDays(days: number): DateValue {
	return todayDate().add({ days });
}

function getPresetRange(id: PresetId): DateRange | undefined {
	if (id === "all") return undefined;
	if (id === "today") return { start: todayDate(), end: todayDate() };
	if (id === "yesterday") return { start: shiftDays(-1), end: shiftDays(-1) };
	if (id === "last7") return { start: shiftDays(-6), end: todayDate() };
	return { start: shiftDays(-29), end: todayDate() };
}

function dateValueToISO(d: DateValue | undefined): string {
	if (!d) return "";
	return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function isoToDateValue(iso: string): DateValue | undefined {
	if (!iso) return undefined;
	try {
		return parseDate(iso);
	} catch {
		return undefined;
	}
}

function initializeValue(): DateRange | undefined {
	if (!start || !end) return undefined;
	const startVal = isoToDateValue(start);
	const endVal = isoToDateValue(end);
	if (!startVal || !endVal) return undefined;
	return { start: startVal, end: endVal };
}

let internalValue = $state<DateRange | undefined>(initializeValue());

const activePresetId = $derived(
	(() => {
		for (const p of presets) {
			const r = getPresetRange(p.id);
			if (!r && !start && !end) return p.id;
			if (r && start === dateValueToISO(r.start) && end === dateValueToISO(r.end)) return p.id;
		}
		return null;
	})()
);

function applyPreset(id: PresetId) {
	const range = getPresetRange(id);
	internalValue = range;
	start = range ? dateValueToISO(range.start) : "";
	end = range ? dateValueToISO(range.end) : "";
	onchange?.();
}

function handleValueChange(newValue: { start: DateValue | undefined; end: DateValue | undefined } | undefined) {
	if (newValue?.start && newValue?.end) {
		internalValue = { start: newValue.start, end: newValue.end };
		start = dateValueToISO(newValue.start);
		end = dateValueToISO(newValue.end);
		onchange?.();
	} else if (!newValue) {
		internalValue = undefined;
		start = "";
		end = "";
		onchange?.();
	}
}
</script>

<div class={cn("flex flex-col gap-2", className)}>
	<DateRangePickerPrimitive.Root
		value={internalValue}
		onValueChange={handleValueChange}
		weekdayFormat="short"
		fixedWeeks={true}
		class="flex w-full flex-col gap-1.5"
	>
		<div
			class="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
		>
			{#each ["start", "end"] as const as type (type)}
				<DateRangePickerPrimitive.Input {type} class="flex items-center">
					{#snippet children({ segments })}
						{#each segments as { part, value }, i (part + i)}
							{#if part === "literal"}
								<span class="text-muted-foreground px-0.5">{value}</span>
							{:else}
								<DateRangePickerPrimitive.Segment
									{part}
									class="rounded px-1 py-0.5 hover:bg-muted focus:bg-muted focus:outline-none aria-[valuetext=Empty]:text-muted-foreground"
								>
									{value}
								</DateRangePickerPrimitive.Segment>
							{/if}
						{/each}
					{/snippet}
				</DateRangePickerPrimitive.Input>
				{#if type === "start"}
					<span class="text-muted-foreground px-2">–</span>
				{/if}
			{/each}
			<DateRangePickerPrimitive.Trigger class="ml-auto text-muted-foreground hover:text-foreground">
				<CalendarIcon class="h-4 w-4" />
			</DateRangePickerPrimitive.Trigger>
		</div>

		<DateRangePickerPrimitive.Content
			sideOffset={6}
			class="z-50 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
		>
			<DateRangePickerPrimitive.Calendar class="p-3">
				{#snippet children({ months, weekdays })}
					<DateRangePickerPrimitive.Header class="flex items-center justify-between pb-4">
						<DateRangePickerPrimitive.PrevButton>
							{#snippet child({ props })}
								<Button {...props} variant="outline" size="icon" class="h-7 w-7">
									<ChevronLeft class="h-4 w-4" />
								</Button>
							{/snippet}
						</DateRangePickerPrimitive.PrevButton>
						<DateRangePickerPrimitive.Heading class="text-sm font-medium" />
						<DateRangePickerPrimitive.NextButton>
							{#snippet child({ props })}
								<Button {...props} variant="outline" size="icon" class="h-7 w-7">
									<ChevronRight class="h-4 w-4" />
								</Button>
							{/snippet}
						</DateRangePickerPrimitive.NextButton>
					</DateRangePickerPrimitive.Header>

					<div class="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
						{#each months as month (month.value.toString())}
							<DateRangePickerPrimitive.Grid class="w-full border-collapse space-y-1">
								<DateRangePickerPrimitive.GridHead>
									<DateRangePickerPrimitive.GridRow class="mb-1 flex w-full justify-between">
										{#each weekdays as day (day)}
											<DateRangePickerPrimitive.HeadCell
												class="w-8 text-center text-[0.8rem] font-medium text-muted-foreground"
											>
												{day.slice(0, 2)}
											</DateRangePickerPrimitive.HeadCell>
										{/each}
									</DateRangePickerPrimitive.GridRow>
								</DateRangePickerPrimitive.GridHead>
								<DateRangePickerPrimitive.GridBody>
									{#each month.weeks as weekDates (weekDates.map(d => d.toString()).join())}
										<DateRangePickerPrimitive.GridRow class="flex w-full">
											{#each weekDates as date (date.toString())}
												<DateRangePickerPrimitive.Cell
													{date}
													month={month.value}
													class="relative p-0 text-center text-sm"
												>
													<DateRangePickerPrimitive.Day
														class={cn(
															"inline-flex h-8 w-8 items-center justify-center rounded-md p-0 text-sm font-normal",
															"hover:bg-accent hover:text-accent-foreground",
															"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
															"data-[selected]:bg-accent data-[selected]:text-accent-foreground",
															"data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground",
															"data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground",
															"data-[highlighted]:bg-accent data-[highlighted]:rounded-none",
															"data-[selection-start]:rounded-l-md data-[selection-end]:rounded-r-md",
															"data-[disabled]:pointer-events-none data-[disabled]:opacity-30",
															"data-[outside-month]:pointer-events-none data-[outside-month]:opacity-30",
															"data-[today]:font-semibold"
														)}
													>
														{date.day}
													</DateRangePickerPrimitive.Day>
												</DateRangePickerPrimitive.Cell>
											{/each}
										</DateRangePickerPrimitive.GridRow>
									{/each}
								</DateRangePickerPrimitive.GridBody>
							</DateRangePickerPrimitive.Grid>
						{/each}
					</div>
				{/snippet}
			</DateRangePickerPrimitive.Calendar>
		</DateRangePickerPrimitive.Content>
	</DateRangePickerPrimitive.Root>

	<div class="flex flex-wrap gap-2" role="group" aria-label={t("date")}>
		{#each presets as p (p.id)}
			<button
				type="button"
				class={cn(
					"rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted",
					activePresetId === p.id
						? "bg-primary text-primary-foreground border-primary"
						: "bg-background text-muted-foreground border-input"
				)}
				aria-pressed={activePresetId === p.id}
				onclick={() => applyPreset(p.id)}
			>
				{t(p.labelKey)}
			</button>
		{/each}
	</div>
</div>
