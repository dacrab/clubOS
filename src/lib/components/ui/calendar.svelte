<script lang="ts">
import { Calendar as CalendarPrimitive } from "bits-ui";
import { ChevronLeft, ChevronRight } from "@lucide/svelte";
import { getLocalTimeZone, today, type DateValue } from "@internationalized/date";
import { cn } from "$lib/utils/utils";
import { Button } from "$lib/components/ui/button";

type CalendarProps = {
	value?: DateValue;
	placeholder?: DateValue;
	class?: string;
	onValueChange?: (value: DateValue | undefined) => void;
};

let {
	value = $bindable(today(getLocalTimeZone())),
	placeholder = $bindable(today(getLocalTimeZone())),
	class: className = "",
	onValueChange,
}: CalendarProps = $props();

function handleChange(newValue: DateValue | undefined) {
	if (newValue) {
		value = newValue;
	}
	onValueChange?.(newValue);
}
</script>

<CalendarPrimitive.Root
	type="single"
	{value}
	onValueChange={handleChange}
	bind:placeholder
	weekdayFormat="short"
	fixedWeeks={true}
	class={cn("rounded-md border border-border bg-background p-3 shadow-sm", className)}
>
	{#snippet children({ months, weekdays })}
		<CalendarPrimitive.Header class="flex items-center justify-between pb-4">
			<CalendarPrimitive.PrevButton>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="icon" class="h-7 w-7">
						<ChevronLeft class="h-4 w-4" />
					</Button>
				{/snippet}
			</CalendarPrimitive.PrevButton>
			<CalendarPrimitive.Heading class="text-sm font-medium" />
			<CalendarPrimitive.NextButton>
				{#snippet child({ props })}
					<Button {...props} variant="outline" size="icon" class="h-7 w-7">
						<ChevronRight class="h-4 w-4" />
					</Button>
				{/snippet}
			</CalendarPrimitive.NextButton>
		</CalendarPrimitive.Header>

		<div class="flex flex-col space-y-4">
			{#each months as month (month.value.toString())}
				<CalendarPrimitive.Grid class="w-full border-collapse space-y-1">
					<CalendarPrimitive.GridHead>
						<CalendarPrimitive.GridRow class="mb-1 flex w-full justify-between">
							{#each weekdays as day (day)}
								<CalendarPrimitive.HeadCell
									class="w-8 text-center text-[0.8rem] font-medium text-muted-foreground"
								>
									{day.slice(0, 2)}
								</CalendarPrimitive.HeadCell>
							{/each}
						</CalendarPrimitive.GridRow>
					</CalendarPrimitive.GridHead>
					<CalendarPrimitive.GridBody>
						{#each month.weeks as weekDates (weekDates.map(d => d.toString()).join())}
							<CalendarPrimitive.GridRow class="flex w-full">
								{#each weekDates as date (date.toString())}
									<CalendarPrimitive.Cell
										{date}
										month={month.value}
										class="relative p-0 text-center text-sm"
									>
										<CalendarPrimitive.Day
											class={cn(
												"inline-flex h-8 w-8 items-center justify-center rounded-md p-0 text-sm font-normal",
												"hover:bg-accent hover:text-accent-foreground",
												"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
												"data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[selected]:hover:bg-primary data-[selected]:hover:text-primary-foreground",
												"data-[disabled]:pointer-events-none data-[disabled]:opacity-30",
												"data-[outside-month]:pointer-events-none data-[outside-month]:opacity-30",
												"data-[today]:bg-accent data-[today]:text-accent-foreground"
											)}
										>
											{date.day}
										</CalendarPrimitive.Day>
									</CalendarPrimitive.Cell>
								{/each}
							</CalendarPrimitive.GridRow>
						{/each}
					</CalendarPrimitive.GridBody>
				</CalendarPrimitive.Grid>
			{/each}
		</div>
	{/snippet}
</CalendarPrimitive.Root>
