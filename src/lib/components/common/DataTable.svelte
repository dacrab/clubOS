<script lang="ts">
  import Table from '$lib/components/ui/table/table.svelte';
  import TableBody from '$lib/components/ui/table/table-body.svelte';
  import TableCell from '$lib/components/ui/table/table-cell.svelte';
  import TableHead from '$lib/components/ui/table/table-head.svelte';
  import TableHeader from '$lib/components/ui/table/table-header.svelte';
  import TableRow from '$lib/components/ui/table/table-row.svelte';

  export type Column<T> = {
    key: keyof T | string;
    header: string;
    cell?: (row: T) => any;
    align?: 'left' | 'right' | 'center';
  };

  let { columns, rows }: { columns: Array<Column<any>>; rows: any[] } = $props();
</script>

<Table>
  <TableHeader>
    <TableRow>
      {#each columns as col}
        <TableHead class={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : undefined}>{col.header}</TableHead>
      {/each}
    </TableRow>
  </TableHeader>
  <TableBody>
    {#each rows as row}
      <TableRow>
        {#each columns as col}
          <TableCell class={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : undefined}>
            {#if col.cell}
              {@render col.cell(row)}
            {:else}
              {row[col.key as keyof typeof row]}
            {/if}
          </TableCell>
        {/each}
      </TableRow>
    {/each}
  </TableBody>
</Table>
