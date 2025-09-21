<script lang="ts">
import Table from "$lib/components/ui/table/table.svelte";
import TableBody from "$lib/components/ui/table/table-body.svelte";
import TableCell from "$lib/components/ui/table/table-cell.svelte";
import TableHead from "$lib/components/ui/table/table-head.svelte";
import TableHeader from "$lib/components/ui/table/table-header.svelte";
import TableRow from "$lib/components/ui/table/table-row.svelte";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => any;
  align?: "left" | "right" | "center";
};

const { columns, rows }: { columns: Array<Column<any>>; rows: any[] } =
  $props();
</script>

<Table class="[&_th]:h-9 [&_td]:h-12">
  <TableHeader>
    <TableRow>
      {#each columns as col}
        <TableHead class={`text-xs font-medium text-muted-foreground ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>{col.header}</TableHead>
      {/each}
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each rows as row}
      <TableRow>
        {#each columns as col}
          <TableCell class={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} text-sm`}>
            {#if col.cell}
              {#if typeof col.cell(row) === 'string' || typeof col.cell(row) === 'number'}
                {@html String(col.cell(row))}
              {:else}
                {@render col.cell(row)}
              {/if}
            {:else}
              {row[col.key as keyof typeof row]}
            {/if}
          </TableCell>
        {/each}
      </TableRow>
    {/each}
  </TableBody>
</Table>
