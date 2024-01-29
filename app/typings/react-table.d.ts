/* eslint-disable @typescript-eslint/ban-types */
import {
  UsePaginationInstanceProps,
  UsePaginationOptions,
  UsePaginationState,
  UseSortByColumnOptions,
  UseSortByColumnProps,
  UseSortByHooks,
  UseSortByInstanceProps,
  UseSortByOptions,
  UseSortByState,
} from "react-table";

declare module "react-table" {
  export interface TableOptions<D extends object>
    extends UseExpandedOptions<D>,
      UsePaginationOptions<D>,
      UseSortByOptions<D>,
      // note that having Record here allows you to add anything to the options, this matches the spirit of the
      // underlying js library, but might be cleaner if it's replaced by a more specific type that matches your
      // feature set, this is a safe default.
      Record<string, any> {}

  export interface Hooks<D extends object = {}>
    extends UseExpandedHooks<D>,
      UseSortByHooks<D> {}

  export interface TableInstance<D extends object = {}>
    extends UsePaginationInstanceProps<D>,
      UseSortByInstanceProps<D> {}

  export interface TableState<D extends object = {}>
    extends UseColumnOrderState<D>,
      UseExpandedState<D>,
      UsePaginationState<D>,
      UseSortByState<D> {}

  export interface ColumnInterface<D extends object = {}>
    extends UseResizeColumnsColumnOptions<D>,
      UseSortByColumnOptions<D> {}

  export interface ColumnInstance<D extends object = {}>
    extends UseResizeColumnsColumnProps<D>,
      UseSortByColumnProps<D> {}

  export interface Cell<D extends object = {}>
    extends UseGroupByCellProps<D>,
      UseRowStateCellProps<D> {}

  export interface Row<D extends object = {}>
    extends UseExpandedRowProps<D>,
      UseGroupByRowProps<D>,
      UseRowSelectRowProps<D>,
      UseRowStateRowProps<D> {}
}
