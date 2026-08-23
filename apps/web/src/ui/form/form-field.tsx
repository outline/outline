import { useId } from "react";
import { cn } from "@/shared/utils";
import { styles } from "./form-field.styles";

export type TFormFieldProps = {
	readonly label?: string;
	readonly error?: string;
	readonly children: React.ReactElement<{ id?: string }>;
	readonly className?: string;
	readonly required?: boolean;
};

export const FormField = ({
	label,
	error,
	children,
	className,
	required,
}: TFormFieldProps) => {
	const defaultId = useId();
	const childId = children.props.id || defaultId;

	return (
		<div className={cn(styles.container, className)}>
			{label && (
				<label htmlFor={childId} className={styles.label}>
					{label} {required && <span className={styles.required}>*</span>}
				</label>
			)}
			<div className="relative">
				{React.cloneElement(children, { id: childId })}
			</div>
			{error && <p className={styles.error}>{error}</p>}
		</div>
	);
};

import * as React from "react";
