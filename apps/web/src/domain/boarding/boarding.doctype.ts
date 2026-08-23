import type { TDocType } from "@/lib/form-builder/types";
import { i18n } from "@/shared/i18n/i18n.config";

export const BoardingDocType: TDocType = {
	name: "BoardingRegistration",
	module: "Boarding",
	fields: [
		{
			fieldname: "step_schedule",
			fieldtype: "step_break",
			label: i18n.t("boarding_form.steps.schedule.title"),
			description: i18n.t("boarding_form.steps.schedule.description"),
		},
		{
			fieldname: "branchId",
			fieldtype: "select",
			label: i18n.t("boarding_form.labels.branch"),
			required: true,
			options: [], // Injected dynamically
		},
		{
			fieldname: "roomId",
			fieldtype: "select",
			label: i18n.t("boarding_form.labels.room"),
			required: true,
			options: [], // Injected dynamically
			depends_on: "eval:!!doc.branchId",
		},
		{
			fieldname: "dailyRate",
			fieldtype: "currency",
			label: i18n.t("boarding_form.labels.daily_rate"),
			read_only: true,
			hidden: true,
		},
		{
			fieldname: "scheduleRange",
			fieldtype: "date_range",
			label: i18n.t("boarding_form.labels.schedule_range"),
			required: true,
			description: i18n.t("boarding_form.labels.schedule_range_desc"),
			placeholder: i18n.t("boarding_form.placeholders.schedule_range"),
		},

		{
			fieldname: "step_owner",
			fieldtype: "step_break",
			label: i18n.t("boarding_form.steps.owner.title"),
			description: i18n.t("boarding_form.steps.owner.description"),
		},
		{
			fieldname: "customerSelector",
			fieldtype: "custom_component",
			label: i18n.t("boarding_form.labels.customer"),
		},
		{
			fieldname: "branchId",
			label: "",
			fieldtype: "text",
			hidden: true,
		},
		{
			fieldname: "consentAcceptedAt",
			label: "",
			fieldtype: "check",
			hidden: true,
			default_value: false,
		},
		{
			fieldname: "customerId",
			fieldtype: "text",
			label: "",
			hidden: true,
		},
		{
			fieldname: "isCreatingNew",
			label: "",
			fieldtype: "check",
			hidden: true,
			default_value: false,
		},
		{
			fieldname: "ownerName",
			fieldtype: "text",
			label: i18n.t("boarding_form.labels.owner_name"),
			required: true,
			read_only_depends_on: "eval:!doc.isCreatingNew",
			depends_on: "eval:doc.isCreatingNew || !!doc.customerId",
		},
		{
			fieldname: "ownerPhone",
			fieldtype: "text",
			label: i18n.t("boarding_form.labels.owner_phone"),
			required: true,
			read_only_depends_on: "eval:!doc.isCreatingNew",
			depends_on: "eval:doc.isCreatingNew || !!doc.customerId",
		},
		{
			fieldname: "ownerAddress",
			fieldtype: "long_text",
			label: i18n.t("boarding_form.labels.owner_address"),
			required: true,
			read_only_depends_on: "eval:!doc.isCreatingNew",
			depends_on: "eval:doc.isCreatingNew || !!doc.customerId",
		},
		{
			fieldname: "emergencyContactName",
			fieldtype: "text",
			label: i18n.t("boarding_form.labels.emergency_name"),
			depends_on: "eval:doc.isCreatingNew || !!doc.customerId",
		},
		{
			fieldname: "emergencyContactPhone",
			fieldtype: "text",
			label: i18n.t("boarding_form.labels.emergency_phone"),
			depends_on: "eval:doc.isCreatingNew || !!doc.customerId",
		},

		{
			fieldname: "step_pets",
			fieldtype: "step_break",
			label: i18n.t("boarding_form.steps.pets.title"),
			description: i18n.t("boarding_form.steps.pets.description"),
		},
		{
			fieldname: "pets",
			fieldtype: "table",
			label: i18n.t("boarding_form.labels.pet_list"),
			required: true,
			child_doctype: "BoardingPet",
			child_fields: [
				{
					fieldname: "name",
					fieldtype: "text",
					label: i18n.t("boarding_form.labels.pet_name"),
					required: true,
					in_list_view: true,
					colspan: 1,
				},
				{
					fieldname: "kind",
					fieldtype: "select",
					label: i18n.t("boarding_form.labels.pet_kind"),
					required: true,
					options: [
						{
							value: "cat",
							label: i18n.t("boarding_form.labels.pet_kinds.cat"),
						},
						{
							value: "dog",
							label: i18n.t("boarding_form.labels.pet_kinds.dog"),
						},
					],
					in_list_view: true,
					colspan: 1,
				},
				{
					fieldname: "breed",
					fieldtype: "text",
					label: i18n.t("boarding_form.labels.pet_breed"),
					in_list_view: true,
					colspan: 1,
				},
				{
					fieldname: "weight",
					fieldtype: "text",
					label: i18n.t("boarding_form.labels.pet_weight"),
					colspan: 1,
				},
				{
					fieldname: "vaccinated",
					fieldtype: "select",
					label: i18n.t("boarding_form.labels.pet_vaccinated"),
					options: [
						{
							value: "yes",
							label: i18n.t("boarding_form.labels.pet_vaccinated_options.yes"),
						},
						{
							value: "no",
							label: i18n.t("boarding_form.labels.pet_vaccinated_options.no"),
						},
					],
					default_value: "yes",
				},
				{
					fieldname: "health_status",
					fieldtype: "select",
					label: i18n.t("boarding_form.labels.pet_health"),
					options: [
						{
							value: "healthy",
							label: i18n.t("boarding_form.labels.pet_health_options.healthy"),
						},
						{
							value: "sick",
							label: i18n.t("boarding_form.labels.pet_health_options.sick"),
						},
						{
							value: "recovery",
							label: i18n.t("boarding_form.labels.pet_health_options.recovery"),
						},
					],
					in_list_view: true,
					default_value: "healthy",
				},
				{
					fieldname: "initial_condition",
					fieldtype: "text",
					label: i18n.t("boarding_form.labels.initial_condition"),
				},
				{
					fieldname: "notes",
					fieldtype: "text",
					label: i18n.t("boarding_form.labels.special_notes"),
				},
			],
		},

		{
			fieldname: "step_agreement",
			fieldtype: "step_break",
			label: i18n.t("boarding_form.steps.agreement.title"),
			description: i18n.t("boarding_form.steps.agreement.description"),
		},
		{
			fieldname: "internal_notes",
			fieldtype: "long_text",
			label: i18n.t("boarding_form.labels.internal_notes"),
		},
		{
			fieldname: "agreement",
			fieldtype: "check",
			label: i18n.t("boarding_form.labels.agreement_check"),
		},
		{
			fieldname: "signature",
			fieldtype: "signature",
			label: i18n.t("boarding_form.labels.signature"),
			depends_on: "eval:doc.agreement",
		},
	],
};
