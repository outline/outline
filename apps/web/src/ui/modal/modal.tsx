import { CloseCircleLinear as X } from "solar-icon-set";
import { cn } from "@/shared/utils";
import { styles } from "./modal.styles";

export type TModalProps = {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly title: string;
	readonly subtitle?: string;
	readonly children: React.ReactNode;
	readonly className?: string;
};

export const Modal = ({
	isOpen,
	onClose,
	title,
	subtitle,
	children,
	className,
}: TModalProps) => {
	if (!isOpen) return null;

	return (
		<div
			className={styles.overlay}
			onClick={onClose}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
			role="none"
		>
			<div
				className={cn(styles.modal, className)}
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="modal-title"
			>
				<div className={styles.header}>
					<div>
						<h2 id="modal-title" className={styles.title}>
							{title}
						</h2>
						{subtitle && <p className={styles.subtitle}>{subtitle}</p>}
					</div>
					<button
						type="button"
						onClick={onClose}
						className={styles.closeButton}
						aria-label="Close modal"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className={styles.body}>{children}</div>
			</div>
		</div>
	);
};

import type * as React from "react";
