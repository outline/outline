import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	FileTextLinear as FileIcon,
	ImportLinear as ImportIcon,
	UploadLinear as UploadIcon,
} from "solar-icon-set";
import { cn } from "@/shared/utils";
import { Button } from "../button/button";
import { Modal } from "../modal/modal";

export type TImportModalProps = {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onImport: (data: Record<string, unknown>[]) => Promise<void>;
	readonly title: string;
	readonly description?: string;
	readonly templateHref?: string;
};

export const ImportModal = ({
	isOpen,
	onClose,
	onImport,
	title,
	description,
	templateHref,
}: TImportModalProps) => {
	const { t } = useTranslation();
	const [file, setFile] = useState<File | null>(null);
	const [isImporting, setIsImporting] = useState(false);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			setFile(e.target.files[0]);
		}
	};

	const handleImport = async () => {
		if (!file) return;
		setIsImporting(true);
		try {
			const text = await file.text();
			const rows = text.split("\n").filter((row) => row.trim() !== "");
			if (rows.length < 2) throw new Error("File is empty or missing headers.");

			const headers = rows[0]
				?.split(",")
				.map((h) => h.trim().replace(/^"|"$/g, ""));
			const data = rows.slice(1).map((row) => {
				const values = row
					.split(",")
					.map((v) => v.trim().replace(/^"|"$/g, ""));
				const obj: Record<string, unknown> = {};
				(headers ?? []).forEach((header, i) => {
					obj[header] = values[i];
				});
				return obj;
			});

			await onImport(data);
			onClose();
		} catch (error) {
			console.error("Import failed:", error);
			alert(
				error instanceof Error ? error.message : t("import.error_processing"),
			);
		} finally {
			setIsImporting(false);
			setFile(null);
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title={title}
			{...(description !== undefined ? { subtitle: description } : {})}
		>
			<div className="space-y-6">
				<div
					className={cn(
						"border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors",
						file
							? "border-mint-green bg-mint-green/5"
							: "border-neutral-200 hover:border-neutral-300",
					)}
				>
					{file ? (
						<>
							<FileIcon className="w-10 h-10 text-mint-green" />
							<div className="text-center">
								<p className="text-sm font-medium text-neutral-900">
									{file.name}
								</p>
								<p className="text-xs text-neutral-500">
									{(file.size / 1024).toFixed(2)} KB
								</p>
							</div>
							<button
								type="button"
								onClick={() => setFile(null)}
								className="text-xs text-rose-500 font-medium hover:underline"
							>
								{t("import.change_file")}
							</button>
						</>
					) : (
						<>
							<div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
								<UploadIcon className="w-6 h-6 text-neutral-400" />
							</div>
							<div className="text-center">
								<p className="text-sm font-medium text-neutral-900">
									{t("import.click_to_upload")}
								</p>
								<p className="text-xs text-neutral-500">
									{t("import.csv_limit")}
								</p>
							</div>
							<input
								type="file"
								accept=".csv"
								onChange={handleFileChange}
								className="absolute inset-0 opacity-0 cursor-pointer"
							/>
						</>
					)}
				</div>

				{templateHref && (
					<div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
						<p className="text-[12px] text-amber-800 leading-relaxed">
							{t("import.template_hint")}
							<a
								href={templateHref}
								download
								className="font-bold underline ml-1"
							>
								{t("import.download_template")}
							</a>
						</p>
					</div>
				)}

				<div className="flex gap-3 pt-2">
					<Button
						variant="outline"
						className="flex-1"
						onClick={onClose}
						disabled={isImporting}
					>
						{t("common.cancel")}
					</Button>
					<Button
						className="flex-1 gap-2"
						onClick={handleImport}
						disabled={!file || isImporting}
					>
						<ImportIcon className="w-4 h-4" />
						{isImporting ? t("common.saving") : t("import.start_import")}
					</Button>
				</div>
			</div>
		</Modal>
	);
};
