<script lang="ts">
import { Calendar } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button";
import { Calendar as CalendarComponent } from "$lib/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "$lib/components/ui/popover";

let {
  value = $bindable(""),
  class: className = "",
  ...props
} = $props<{
  value: string;
  class?: string;
  [key: string]: unknown;
}>();

let open = $state(false);
let calendarValue = $state(new Date());

$effect(() => {
  if (value) {
    calendarValue = new Date(value);
  }
});

$effect(() => {
  if (calendarValue) {
    value = calendarValue.toISOString().split("T")[0];
  }
});
</script>

<Popover bind:open>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      class="justify-start text-left font-normal {className}"
      {...props}
    >
      <Calendar class="mr-2 h-4 w-4" />
      {value ? new Date(value).toLocaleDateString("en-GB") : "Select date"}
    </Button>
  </PopoverTrigger>
  <PopoverContent class="w-auto p-0" align="start">
    <CalendarComponent bind:value={calendarValue} initialFocus />
  </PopoverContent>
</Popover>
