import { useMemo, useState } from "react";

export function usePagination<T>(data: readonly T[], initialPageSize = 10) {
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(initialPageSize);

	const totalItems = data.length;
	const totalPages = Math.ceil(totalItems / pageSize) || 1;

	// Ensure currentPage is valid if data shrinks
	const safeCurrentPage = Math.min(currentPage, totalPages);

	const paginatedData = useMemo(() => {
		const start = (safeCurrentPage - 1) * pageSize;
		const end = start + pageSize;
		return data.slice(start, end);
	}, [data, safeCurrentPage, pageSize]);

	const handlePageChange = (page: number) => {
		const validPage = Math.max(1, Math.min(page, totalPages));
		setCurrentPage(validPage);
	};

	const handlePageSizeChange = (size: number) => {
		setPageSize(size);
		setCurrentPage(1); // Reset to first page when size changes
	};

	return {
		paginatedData,
		currentPage: safeCurrentPage,
		totalPages,
		totalItems,
		pageSize,
		onPageChange: handlePageChange,
		onPageSizeChange: handlePageSizeChange,
	};
}
