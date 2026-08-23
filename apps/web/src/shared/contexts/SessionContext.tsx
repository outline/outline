import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import type { TSessionInfo } from "@/shared/types/session.types";

type TSessionContextValue = {
	authed: boolean | null;
	session: TSessionInfo | null;
	isLoading: boolean;
	error: Error | null;
	updateLanguage: ((lang: string) => Promise<void>) | null;
};

const SessionCtx = createContext<TSessionContextValue | null>(null);

type SessionProviderProps = {
	children: ReactNode;
	getSessionInfo: () => Promise<TSessionInfo | null>;
	updateLanguage?: (lang: string) => Promise<void>;
};

export function SessionProvider({
	children,
	getSessionInfo,
	updateLanguage,
}: SessionProviderProps) {
	const query = useQuery<TSessionInfo | null, Error>({
		queryKey: queryKeys.session.info(),
		queryFn: async () => {
			try {
				return await getSessionInfo();
			} catch {
				return null;
			}
		},
		staleTime: QUERY_POLICY.session.staleTime,
		gcTime: QUERY_POLICY.session.gcTime,
		retry: false,
	});

	const authed: boolean | null = query.isPending ? null : query.data !== null;

	return (
		<SessionCtx.Provider
			value={{
				authed,
				session: query.data ?? null,
				isLoading: query.isPending,
				error: query.error,
				updateLanguage: updateLanguage ?? null,
			}}
		>
			{children}
		</SessionCtx.Provider>
	);
}

export function useSession() {
	const ctx = useContext(SessionCtx);
	if (!ctx) {
		throw new Error("useSession must be used within a SessionProvider");
	}
	return {
		authed: ctx.authed,
		session: ctx.session,
		isLoading: ctx.isLoading,
		error: ctx.error,
	};
}

export function useLanguageContext() {
	const ctx = useContext(SessionCtx);
	if (!ctx) {
		throw new Error("useLanguageContext must be used within a SessionProvider");
	}
	return { updateLanguage: ctx.updateLanguage };
}
