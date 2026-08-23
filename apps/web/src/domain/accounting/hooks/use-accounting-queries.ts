import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	accountingApi,
	getFinancialSummary,
} from "@/lib/api/accounting.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { invalidateAccounting } from "@/shared/cache/invalidation";
import { queryKeys } from "@/shared/cache/query-keys";

export const useFinancialSummary = () =>
	useQuery({
		queryKey: queryKeys.accounting.financialSummary(),
		queryFn: () => getFinancialSummary(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useExpenses = () =>
	useQuery({
		queryKey: queryKeys.accounting.expenses(),
		queryFn: () => accountingApi.getExpenses(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const usePettyCash = () =>
	useQuery({
		queryKey: queryKeys.accounting.pettyCash(),
		queryFn: () => accountingApi.getPettyCashTransactions(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useJournalEntries = () =>
	useQuery({
		queryKey: queryKeys.accounting.journalEntries(),
		queryFn: () => accountingApi.getJournalEntries(),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
	});

export const useCreateExpense = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			accountingApi.createExpense({ data }),
		onSuccess: () => invalidateAccounting(queryClient),
	});
};

export const useCreatePettyCash = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			accountingApi.createPettyCashTransaction({ data }),
		onSuccess: () => invalidateAccounting(queryClient),
	});
};

export const useCreateJournalEntry = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Record<string, unknown>) =>
			accountingApi.createJournalEntry({ data }),
		onSuccess: () => invalidateAccounting(queryClient),
	});
};
