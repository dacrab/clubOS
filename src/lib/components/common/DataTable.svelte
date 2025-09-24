<script lang="ts">
import { Badge } from "$lib/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "$lib/components/ui/table";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => any;
  align?: "left" | "right" | "center";
  width?: string;
};

let {
  columns,
  rows,
  empty,
  zebra = true,
  dense = false,
  caption,
}: {
  columns: Array<Column<any>>;
  rows: any[];
  empty?: string;
  zebra?: boolean;
  caption?: string;
  dense?: boolean;
} = $props();
</script>

<div class={`data-table ${dense ? "data-table--dense" : ""}`}>
  <Table class={`data-table__table ${zebra ? "data-table__table--zebra" : ""}`}>
    {#if caption}
      <caption class="data-table__caption">{caption}</caption>
    {/if}
    <TableHeader>
      <TableRow>
        {#each columns as col}
          <TableHead
            class={`data-table__head ${
              col.align === "right"
                ? "text-right"
                : col.align === "center"
                  ? "text-center"
                  : "text-left"
            }`}
            style={col.width ? `width:${col.width}` : undefined}
          >
            {col.header}
          </TableHead>
        {/each}
      </TableRow>
    </TableHeader>
    <TableBody>
      {#if rows.length === 0}
        <TableRow>
          <TableCell colspan={columns.length} class="data-table__empty">
            <div class="data-table__empty-state">
              <Badge variant="secondary" class="rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]">
                {caption ?? ""}
              </Badge>
              <p>{empty ?? "No rows available"}</p>
            </div>
          </TableCell>
        </TableRow>
      {:else}
        {#each rows as row, rowIndex}
          <TableRow class={rowIndex % 2 === 1 && zebra ? "data-table__row--muted" : ""} data-row-index={rowIndex}>
            {#each columns as col}
              <TableCell
                class={`data-table__cell ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                      ? "text-center"
                      : "text-left"
                }`}
              >
                {#if col.cell}
                  {@const rendered = col.cell(row)}
                  {#if typeof rendered === "function"}
                    {@render rendered()}
                  {:else if typeof rendered === "string" || typeof rendered === "number"}
                    {@html String(rendered)}
                  {/if}
                {:else}
                  {row[col.key as keyof typeof row]}
                {/if}
              </TableCell>
            {/each}
          </TableRow>
        {/each}
      {/if}
    </TableBody>
  </Table>
</div>
