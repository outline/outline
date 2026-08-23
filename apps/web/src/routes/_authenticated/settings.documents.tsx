import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
	DocumentTextLinear as FileText,
	WidgetLinear as LayoutIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	AnimatedTabs as Tabs,
	AnimatedTabsContent as TabsContent,
	AnimatedTabsList as TabsList,
	AnimatedTabsTrigger as TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	getTemplateByType,
	upsertTemplate,
} from "@/lib/api/document-template.functions";
import { APP_CONFIG } from "@/lib/constants";
import { i18n } from "@/shared/i18n/i18n.config";
import {
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	PageHeader,
} from "@/ui";

export const Route = createFileRoute("/_authenticated/settings/documents")({
	head: () => ({
		meta: [
			{ title: `Atur Surat Penitipan — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: "Atur layout dan teks untuk surat penitipan hewan.",
			},
		],
	}),
	component: BoardingSettingsPage,
});

const DEFAULT_BOARDING_CONTENT = {
	title: "SURAT PERSETUJUAN PENITIPAN HEWAN",
	header:
		"Saya yang bertanda tangan di bawah ini selaku pemilik/penanggung jawab atas hewan tersebut di atas, dengan ini menyatakan setuju untuk menitipkan hewan saya kepada pihak penitipan dengan ketentuan sebagai berikut:",
	p1: "Pemilik menjamin bahwa hewan yang dititipkan dalam keadaan sehat, bebas dari penyakit menular, kutu, dan jamur. Pihak penitipan berhak menolak hewan yang menunjukkan gejala sakit atau kondisi yang membahayakan hewan lain.",
	p2: "Saya menyetujui bahwa jika hewan saya sakit sewaktu di penitipan, pihak penitipan akan menghubungi saya selaku pemilik hewan dalam kondisi dimanapun saya berada dan menginformasikan secepatnya tentang tindakan yang harus diambil terhadap hewan saya.",
	p3: "Apabila selama masa penitipan terjadi kerugian, kerusakan, cidera, penyakit, dan kematian karena interaksi dengan hewan lainnya yang tidak bisa kami cegah, maka saya tidak akan melakukan TUNTUTAN dalam bentuk apapun.",
	p4: "Hewan yang dititipkan harus dengan kondisi sehat. Saya menyetujui semua biaya yang harus dibayarkan selama masa penitipan dan perawatan hewan dilakukan di awal hewan mulai dititipkan.",
	footer:
		"Demikian surat persetujuan ini saya buat dengan penuh kesadaran dan tanpa paksaan dari pihak manapun.",
	fontSize: 11,
	lineSpacing: 1.4,
	paragraphSpacing: 15,
	marginTop: 720,
	showLogo: true,
	showSignature: true,
};

function BoardingSettingsPage() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();

	const { data: template, isLoading } = useQuery({
		queryKey: ["document-template", "boarding_agreement"],
		queryFn: () => getTemplateByType({ data: "boarding_agreement" }),
	});

	const [content, setContent] = React.useState(DEFAULT_BOARDING_CONTENT);

	React.useEffect(() => {
		if (template?.content) {
			setContent({
				...DEFAULT_BOARDING_CONTENT,
				...(template.content as unknown as Record<string, unknown>),
			});
		}
	}, [template]);

	const mutation = useMutation({
		mutationFn: upsertTemplate,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["document-template"] });
			toast.success(i18n.t("common.success_title"), {
				description: t("boarding_settings.toast_save_success"),
			});
		},
	});

	const handleSave = () => {
		mutation.mutate({
			data: {
				id: template?.id,
				type: "boarding_agreement",
				name: t("boarding_settings.tabs.boarding"),
				content,
			},
		});
	};

	const handleChange = (field: string, value: unknown) => {
		setContent((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full bg-white">
			<PageHeader
				title={t("boarding_settings.tabs.boarding")}
				description={t("boarding_settings.subtitle")}
				actions={
					<Button onClick={handleSave} disabled={mutation.isPending}>
						{mutation.isPending ? t("common.saving") : t("common.save_changes")}
					</Button>
				}
			/>

			<div className="p-6 lg:p-8 max-w-4xl mx-auto w-full pb-12 flex-1">
				{isLoading ? (
					<div className="space-y-6">
						<Skeleton className="h-40 w-full rounded-lg" />
					</div>
				) : (
					<Tabs defaultValue="text" className="w-full">
						<TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
							<TabsTrigger value="text" className="flex items-center gap-2">
								<FileText className="w-4 h-4" />
								{t("boarding_settings.tabs.text")}
							</TabsTrigger>
							<TabsTrigger value="layout" className="flex items-center gap-2">
								<LayoutIcon className="w-4 h-4" />
								{t("boarding_settings.tabs.layout")}
							</TabsTrigger>
						</TabsList>

						<TabsContent value="text" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="text-[16px]">
										{t("boarding_settings.sections.header")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-1.5">
										<label
											className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
											htmlFor="docTitle"
										>
											{t("boarding_settings.labels.doc_title")}
										</label>
										<Input
											id="docTitle"
											value={content.title}
											onChange={(e) => handleChange("title", e.target.value)}
											className="font-bold"
										/>
									</div>
									<div className="space-y-1.5">
										<label
											className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
											htmlFor="header"
										>
											{t("boarding_settings.labels.opening_text")}
										</label>
										<Textarea
											id="header"
											value={content.header}
											onChange={(e) => handleChange("header", e.target.value)}
											rows={3}
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-[16px]">
										{t("boarding_settings.sections.points")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-6">
									<div className="space-y-1.5">
										<label
											className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
											htmlFor="p1"
										>
											{t("boarding_settings.labels.point_1")}
										</label>
										<Textarea
											id="p1"
											value={content.p1}
											onChange={(e) => handleChange("p1", e.target.value)}
											rows={3}
										/>
									</div>
									<div className="space-y-1.5">
										<label
											className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
											htmlFor="p2"
										>
											{t("boarding_settings.labels.point_2")}
										</label>
										<Textarea
											id="p2"
											value={content.p2}
											onChange={(e) => handleChange("p2", e.target.value)}
											rows={3}
										/>
									</div>
									<div className="space-y-1.5">
										<label
											className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
											htmlFor="p3"
										>
											{t("boarding_settings.labels.point_3")}
										</label>
										<Textarea
											id="p3"
											value={content.p3}
											onChange={(e) => handleChange("p3", e.target.value)}
											rows={3}
										/>
									</div>
									<div className="space-y-1.5">
										<label
											className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
											htmlFor="p4"
										>
											{t("boarding_settings.labels.point_4")}
										</label>
										<Textarea
											id="p4"
											value={content.p4}
											onChange={(e) => handleChange("p4", e.target.value)}
											rows={3}
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-[16px]">
										{t("boarding_settings.sections.footer")}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-1.5">
										<label
											className="text-[12px] font-bold text-neutral-500 uppercase tracking-wider"
											htmlFor="footer"
										>
											{t("boarding_settings.labels.closing_text")}
										</label>
										<Textarea
											id="footer"
											value={content.footer}
											onChange={(e) => handleChange("footer", e.target.value)}
											rows={2}
										/>
									</div>
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="layout" className="space-y-6">
							<Card>
								<CardHeader>
									<CardTitle className="text-[16px]">
										{t("boarding_settings.sections.visibility")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-6">
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<label
												className="text-[14px] font-semibold"
												htmlFor="showLogo"
											>
												{t("boarding_settings.labels.show_logo")}
											</label>
											<p className="text-[12px] text-neutral-500">
												{t("boarding_settings.labels.show_logo_desc")}
											</p>
										</div>
										<Switch
											id="showLogo"
											checked={content.showLogo}
											onCheckedChange={(checked) =>
												handleChange("showLogo", checked)
											}
										/>
									</div>
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<label
												className="text-[14px] font-semibold"
												htmlFor="showSignature"
											>
												{t("boarding_settings.labels.show_signature")}
											</label>
											<p className="text-[12px] text-neutral-500">
												{t("boarding_settings.labels.show_signature_desc")}
											</p>
										</div>
										<Switch
											id="showSignature"
											checked={content.showSignature}
											onCheckedChange={(checked) =>
												handleChange("showSignature", checked)
											}
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle className="text-[16px]">
										{t("boarding_settings.sections.typography")}
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-8">
									<div className="space-y-4">
										<div className="flex justify-between">
											<label
												className="text-[13px] font-medium"
												htmlFor="fontSize"
											>
												{t("boarding_settings.labels.font_size")} (
												{content.fontSize}px)
											</label>
										</div>
										<Slider
											id="fontSize"
											value={[content.fontSize || 11]}
											min={8}
											max={14}
											step={0.5}
											onValueChange={(val) => handleChange("fontSize", val[0])}
										/>
									</div>

									<div className="space-y-4">
										<div className="flex justify-between">
											<label
												className="text-[13px] font-medium"
												htmlFor="lineSpacing"
											>
												{t("boarding_settings.labels.line_spacing")} (
												{content.lineSpacing})
											</label>
										</div>
										<Slider
											id="lineSpacing"
											value={[content.lineSpacing || 1.4]}
											min={1}
											max={2}
											step={0.1}
											onValueChange={(val) =>
												handleChange("lineSpacing", val[0])
											}
										/>
									</div>

									<div className="space-y-4">
										<div className="flex justify-between">
											<label
												className="text-[13px] font-medium"
												htmlFor="paragraphSpacing"
											>
												{t("boarding_settings.labels.para_spacing")} (
												{content.paragraphSpacing}px)
											</label>
										</div>
										<Slider
											id="paragraphSpacing"
											value={[content.paragraphSpacing || 15]}
											min={5}
											max={40}
											step={1}
											onValueChange={(val) =>
												handleChange("paragraphSpacing", val[0])
											}
										/>
									</div>

									<div className="space-y-4">
										<div className="flex justify-between">
											<label
												className="text-[13px] font-medium"
												htmlFor="marginTop"
											>
												{t("boarding_settings.labels.margin_top")} (
												{content.marginTop}px)
											</label>
											<span className="text-[10px] text-neutral-400">
												{t("boarding_settings.labels.margin_top_desc")}
											</span>
										</div>
										<Slider
											id="marginTop"
											value={[content.marginTop || 720]}
											min={600}
											max={800}
											step={5}
											onValueChange={(val) => handleChange("marginTop", val[0])}
										/>
									</div>
								</CardContent>
							</Card>
						</TabsContent>
						<div className="flex justify-end pt-4">
							<Button onClick={handleSave} disabled={mutation.isPending}>
								{mutation.isPending
									? t("common.saving")
									: t("common.save_changes")}
							</Button>
						</div>
					</Tabs>
				)}
			</div>
		</div>
	);
}
