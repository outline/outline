import { useTranslation } from "react-i18next";
import {
	WalletMoneyLinear as BillIcon,
	CalendarLinear as Calendar,
	CatLinear as Cat,
	CheckCircleLinear as CheckCircle2,
	MapPointLinear as MapPin,
	PenNewSquareLinear as Pencil,
	PhoneLinear as Phone,
	GalleryLinear as PhotoIcon,
	PlayLinear as PlayCircle,
	CloseCircleLinear as XIcon,
} from "solar-icon-set";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/shared/i18n";
import { formatDate } from "@/shared/utils/format";
import { Button, StatusBadge } from "@/ui";
import { SafeHtml } from "@/shared/components/SafeHtml";
import { useBoardingDetail } from "../../hooks/useBoardingDetail";
import { BoardingDailyPhotos } from "./BoardingDailyPhotos";
import { BoardingOpenBill } from "./BoardingOpenBill";

export type TBoardingDetailProps = {
	readonly id: string;
	readonly hideHeader?: boolean;
	readonly onClose?: () => void;
};

const getStatusType = (
	status: string,
): "success" | "warning" | "error" | "info" | "neutral" => {
	switch (status) {
		case "active":
			return "success";
		case "completed":
			return "info";
		case "cancelled":
			return "error";
		case "draft":
			return "warning";
		default:
			return "neutral";
	}
};

export const BoardingDetail = ({
	id,
	hideHeader = false,
	onClose,
}: TBoardingDetailProps) => {
	const { t } = useTranslation();
	const { language } = useLanguage();
	const { boarding, isLoading, activate, setCheckoutOpen, setEditOpen } =
		useBoardingDetail(id);

	if (isLoading) {
		return (
			<div className="flex flex-col min-h-full">
				<div className="p-6 lg:p-8 space-y-8 flex-1">
					<Skeleton className="h-10 w-64 mb-8 rounded-lg" />
					<div className="grid grid-cols-1 gap-6">
						<Skeleton className="h-48 w-full rounded-lg" />
					</div>
				</div>
			</div>
		);
	}

	if (!boarding) {
		return <div className="p-20 text-center">{t("boarding.not_found")}</div>;
	}

	return (
		<div className="flex flex-col h-full bg-white relative">
			{/* Custom Header */}
			<div className="px-6 py-5 flex items-start justify-between border-b border-neutral-100">
				<div className="flex items-center gap-4">
					<Avatar className="w-12 h-12">
						<AvatarFallback seed={boarding.ownerName || "User"}>
							{boarding.ownerName?.charAt(0) || "?"}
						</AvatarFallback>
					</Avatar>
					<div>
						<h2 className="text-[17px] font-bold text-neutral-900 leading-tight">
							{boarding.ownerName}
						</h2>
						{boarding.ownerPhone && (
							<p className="text-[13px] text-neutral-500 mt-0.5 flex items-center gap-1">
								<Phone className="w-3 h-3" />
								{boarding.ownerPhone}
							</p>
						)}
					</div>
				</div>
				<div className="flex items-center gap-3">
					<StatusBadge
						type={getStatusType(boarding.status)}
						label={t(`boardings.${boarding.status}`, boarding.status)}
					/>
					{hideHeader && onClose && (
						<button
							type="button"
							onClick={onClose}
							className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer"
						>
							<XIcon className="w-5 h-5" />
						</button>
					)}
				</div>
			</div>

			{/* Content Body */}
			<div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
				{/* Info Grid */}
				<div className="space-y-4">
					<div className="flex items-start gap-4">
						<div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center shrink-0">
							<MapPin className="w-4 h-4 text-neutral-400" />
						</div>
						<div className="flex-1 flex items-start justify-between">
							<span className="text-[13px] text-neutral-500 font-medium mt-1.5">
								{t("boarding.address")}
							</span>
							<SafeHtml
								html={boarding.ownerAddress}
								className="text-[14px] font-medium text-neutral-900 text-right max-w-[200px] [&>p]:m-0 [&>p]:leading-normal line-clamp-3 mt-1.5"
							/>
						</div>
					</div>

					<div className="flex items-center gap-4">
						<div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center shrink-0">
							<Calendar className="w-4 h-4 text-neutral-400" />
						</div>
						<div className="flex-1 flex items-center justify-between">
							<span className="text-[13px] text-neutral-500 font-medium">
								{t("boardings.check_in")}
							</span>
							<span className="text-[14px] font-medium text-neutral-900">
								{formatDate(boarding.checkInDate, language)}
							</span>
						</div>
					</div>

					{boarding.estimatedCheckOutDate && (
						<div className="flex items-center gap-4">
							<div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center shrink-0" />
							<div className="flex-1 flex items-center justify-between">
								<span className="text-[13px] text-neutral-500 font-medium">
									{t("boardings.est_check_out")}
								</span>
								<span className="text-[14px] font-medium text-neutral-900">
									{formatDate(boarding.estimatedCheckOutDate, language)}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Accordions */}
				<Accordion
					type="multiple"
					defaultValue={["pets", "bill"]}
					className="w-full"
				>
					{/* Pets Accordion */}
					<AccordionItem value="pets" className="border-none mb-4">
						<AccordionTrigger className="hover:no-underline py-3 px-4 bg-neutral-50 rounded-xl data-[state=open]:rounded-b-none transition-all">
							<div className="flex items-center gap-2 text-neutral-700 font-bold">
								<Cat className="w-4 h-4" />
								{t("boardings.pets")} ({boarding.pets.length})
							</div>
						</AccordionTrigger>
						<AccordionContent className="bg-neutral-50/50 px-4 py-4 rounded-b-xl border border-t-0 border-neutral-100">
							<div className="space-y-3">
								{boarding.pets.map((pet) => (
									<div
										key={pet.id}
										className="bg-white p-4 rounded-xl border border-neutral-100 shadow-sm flex items-start gap-4"
									>
										<div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center border border-neutral-100 shrink-0">
											<Cat className="w-5 h-5 text-neutral-400" />
										</div>
										<div className="flex-1">
											<div className="flex items-center justify-between">
												<h3 className="text-[15px] font-bold text-neutral-900">
													{pet.name}
												</h3>
												<StatusBadge
													type={pet.vaccinated === "yes" ? "success" : "error"}
													label={
														pet.vaccinated === "yes"
															? t("common.vaccinated", "Vaksin")
															: t("common.not_vaccinated", "No Vaksin")
													}
												/>
											</div>
											<div className="text-[13px] text-neutral-500 font-medium mt-1">
												{t(`boarding.${pet.kind}`, pet.kind)} • {pet.breed}
											</div>
											{pet.notes && (
												<p className="text-[12px] text-neutral-500 mt-2 bg-neutral-50 p-2 rounded-lg italic">
													"{pet.notes}"
												</p>
											)}
										</div>
									</div>
								))}
							</div>
						</AccordionContent>
					</AccordionItem>

					{/* Open Bill Accordion */}
					<AccordionItem value="bill" className="border-none mb-4">
						<AccordionTrigger className="hover:no-underline py-3 px-4 bg-neutral-50 rounded-xl data-[state=open]:rounded-b-none transition-all">
							<div className="flex items-center gap-2 text-neutral-700 font-bold">
								<BillIcon className="w-4 h-4" />
								Open Bill
							</div>
						</AccordionTrigger>
						<AccordionContent className="bg-neutral-50/50 px-4 py-4 rounded-b-xl border border-t-0 border-neutral-100">
							<BoardingOpenBill boardingId={boarding.id} />
						</AccordionContent>
					</AccordionItem>

					{/* Photos Accordion */}
					<AccordionItem value="photos" className="border-none mb-4">
						<AccordionTrigger className="hover:no-underline py-3 px-4 bg-neutral-50 rounded-xl data-[state=open]:rounded-b-none transition-all">
							<div className="flex items-center gap-2 text-neutral-700 font-bold">
								<PhotoIcon className="w-4 h-4" />
								Daily Photos
							</div>
						</AccordionTrigger>
						<AccordionContent className="bg-neutral-50/50 px-4 py-4 rounded-b-xl border border-t-0 border-neutral-100">
							<BoardingDailyPhotos boardingId={boarding.id} />
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>

			{/* Footer Actions */}
			<div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between gap-3 bg-white shrink-0">
				{hideHeader && onClose ? (
					<Button
						variant="outline"
						onClick={onClose}
						className="rounded-xl px-6 h-10 border-neutral-200"
					>
						{t("common.cancel", "Cancel")}
					</Button>
				) : (
					<div />
				)}

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={() => setEditOpen(true)}
						className="rounded-xl px-6 h-10 border-neutral-200"
					>
						<Pencil className="w-4 h-4 mr-2" />
						{t("common.edit", "Edit")}
					</Button>

					{boarding.status === "active" && (
						<Button
							onClick={() => setCheckoutOpen(true)}
							className="rounded-xl px-6 h-10 bg-primary"
						>
							<CheckCircle2 className="w-4 h-4 mr-2" />
							Check Out
						</Button>
					)}

					{boarding.status === "draft" && (
						<Button
							onClick={activate}
							variant="mint"
							className="rounded-xl px-6 h-10"
						>
							<PlayCircle className="w-4 h-4 mr-2" />
							{t("common.activate", "Aktifkan")}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
};
