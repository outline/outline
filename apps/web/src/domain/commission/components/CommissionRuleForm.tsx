import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const ruleFormSchema = z.object({
	model: z.enum(["percentage", "fixed", "size_tier"]),
	ratePercent: z.number().min(0).max(100),
	rateFixed: z.number().min(0),
	rateSmall: z.number().min(0),
	rateMedium: z.number().min(0),
	rateLarge: z.number().min(0),
	rateXl: z.number().min(0),
	includeAddons: z.boolean(),
});

export type RuleFormValues = z.infer<typeof ruleFormSchema>;

interface CommissionRuleFormProps {
	initialValues?: Partial<RuleFormValues>;
	onSubmit: (values: RuleFormValues) => void;
	onCancel: () => void;
	isSubmitting?: boolean;
}

export function CommissionRuleForm({
	initialValues,
	onSubmit,
	onCancel,
	isSubmitting,
}: CommissionRuleFormProps) {
	const { t } = useTranslation();
	const form = useForm<RuleFormValues>({
		resolver: zodResolver(ruleFormSchema),
		defaultValues: {
			model: "percentage",
			ratePercent: 0,
			rateFixed: 0,
			rateSmall: 0,
			rateMedium: 0,
			rateLarge: 0,
			rateXl: 0,
			includeAddons: false,
			...initialValues,
		},
	});

	const selectedModel = form.watch("model");

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			<div className="grid grid-cols-2 gap-6">
				<div className="space-y-2">
					<Label>{t("commission.model_label")}</Label>
					<Controller
						control={form.control}
						name="model"
						render={({ field }) => (
							<Select value={field.value} onValueChange={field.onChange}>
								<SelectTrigger>
									<SelectValue
										placeholder={t("commission.model_placeholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="percentage">
										{t("commission.percentage_label")}
									</SelectItem>
									<SelectItem value="fixed">
										{t("commission.fixed_label")}
									</SelectItem>
									<SelectItem value="size_tier">
										{t("commission.size_tier_label")}
									</SelectItem>
								</SelectContent>
							</Select>
						)}
					/>
				</div>

				<div className="space-y-2 flex flex-col justify-end">
					<div className="flex items-center gap-2">
						<Controller
							control={form.control}
							name="includeAddons"
							render={({ field }) => (
								<Switch
									checked={field.value}
									onCheckedChange={field.onChange}
									id="includeAddons"
								/>
							)}
						/>
						<Label htmlFor="includeAddons" className="font-normal">
							{t("commission.include_addons_label")}
						</Label>
					</div>
				</div>

				{selectedModel === "percentage" && (
					<div className="space-y-2 col-span-2 sm:col-span-1">
						<Label>{t("commission.percentage_rate_label")}</Label>
						<Input
							type="number"
							step="0.1"
							{...form.register("ratePercent", { valueAsNumber: true })}
						/>
					</div>
				)}

				{selectedModel === "fixed" && (
					<div className="space-y-2 col-span-2 sm:col-span-1">
						<Label>{t("commission.fixed_rate_label")}</Label>
						<Input
							type="number"
							{...form.register("rateFixed", { valueAsNumber: true })}
						/>
					</div>
				)}

				{selectedModel === "size_tier" && (
					<div className="col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div className="space-y-2">
							<Label>Size Small (Rp)</Label>
							<Input
								type="number"
								{...form.register("rateSmall", { valueAsNumber: true })}
							/>
						</div>
						<div className="space-y-2">
							<Label>Size Medium (Rp)</Label>
							<Input
								type="number"
								{...form.register("rateMedium", { valueAsNumber: true })}
							/>
						</div>
						<div className="space-y-2">
							<Label>Size Large (Rp)</Label>
							<Input
								type="number"
								{...form.register("rateLarge", { valueAsNumber: true })}
							/>
						</div>
						<div className="space-y-2">
							<Label>Size XL (Rp)</Label>
							<Input
								type="number"
								{...form.register("rateXl", { valueAsNumber: true })}
							/>
						</div>
					</div>
				)}
			</div>

			<div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
				<Button variant="ghost" type="button" onClick={onCancel}>
					{t("common.cancel")}
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? t("common.saving") : t("commission.save_rule")}
				</Button>
			</div>
		</form>
	);
}
