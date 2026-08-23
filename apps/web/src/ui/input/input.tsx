import * as React from "react";
import { cn } from "@/shared/utils";
import { styles } from "./input.styles";

export type TInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
	readonly label?: string;
	readonly error?: string;
};

export const Input = React.forwardRef<HTMLInputElement, TInputProps>(
	({ className, type, label, error, id, ...props }, ref) => {
		const generatedId = React.useId();
		const inputId = id || generatedId;
		return (
			<div className={styles.container}>
				{label && (
					<label htmlFor={inputId} className={styles.label}>
						{label}
					</label>
				)}
				<input
					id={inputId}
					type={type}
					className={cn(styles.input, error && styles.inputError, className)}
					ref={ref}
					{...props}
				/>
				{error && <p className={styles.error}>{error}</p>}
			</div>
		);
	},
);

Input.displayName = "Input";
