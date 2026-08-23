import { useTranslation } from "react-i18next";
import { FormBuilder } from "@/lib/form-builder";
import { getCustomerDocType } from "@/lib/form-builder/examples/customer.doctype";
import type {
	ICreateCustomerCommand,
	ICustomer,
	IUpdateCustomerCommand,
} from "../customer.types";

export type TCustomerFormProps = {
	readonly initialValues?: ICustomer;
	readonly onSubmit: (
		values: ICreateCustomerCommand | IUpdateCustomerCommand,
	) => Promise<{ message: string; error?: boolean }>;
};

export const CustomerForm = ({
	initialValues,
	onSubmit,
}: TCustomerFormProps) => {
	const { t } = useTranslation();
	const doctype = getCustomerDocType(t);

	return (
		<div className="p-1">
			<FormBuilder
				doctype={doctype}
				mode={initialValues ? "edit" : "create"}
				initialValues={initialValues as unknown as Record<string, unknown>}
				onSubmit={async (values) => {
					if (initialValues) {
						return await onSubmit({
							id: initialValues.id,
							...(values as Record<string, unknown>),
						} as IUpdateCustomerCommand);
					}
					return await onSubmit(values as unknown as ICreateCustomerCommand);
				}}
			/>
		</div>
	);
};
