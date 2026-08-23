import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	Card2Linear as BillingIcon,
	UsersGroupTwoRoundedLinear as StaffIcon,
	UserCircleLinear as UserIcon,
} from "solar-icon-set";

export const Route = createFileRoute("/_authenticated/settings")({
	component: SettingsLayout,
});

function SettingsLayout() {
	const { t } = useTranslation();
	const _path = useRouterState({ select: (s) => s.location.pathname });

	const _tabs = [
		{ to: "/settings", label: t("settings.personal_info"), icon: UserIcon },
		{
			to: "/settings/billing",
			label: t("settings.billing_info"),
			icon: BillingIcon,
		},
		{ to: "/staff", label: t("nav.staff"), icon: StaffIcon },
	];

	return (
		<div className="flex flex-col min-h-full bg-white flex-1">
			<Outlet />
		</div>
	);
}
