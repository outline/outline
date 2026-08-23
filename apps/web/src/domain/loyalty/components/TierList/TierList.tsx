import { useTranslation } from "react-i18next";
import { CheckCircleLinear as Check } from "solar-icon-set";
import type { TLoyaltyTier } from "@/domain/loyalty";
import { Card } from "@/ui";
import { styles } from "./TierList.styles";

export type TTierListProps = {
	readonly tiers: readonly TLoyaltyTier[];
};

export const TierList = ({ tiers }: TTierListProps) => {
	const { t } = useTranslation();

	return (
		<div className={styles.grid}>
			{tiers.map((tier) => (
				<Card key={tier.id} className={styles.card}>
					<div className={styles.header}>
						<h3 className={styles.tierName}>{tier.name}</h3>
						<span className={styles.minPoints}>
							{t("loyalty.min_points_label", { points: tier.minPoints })}
						</span>
					</div>
					<div className={styles.discountBadge}>
						{tier.discountPercent}% OFF
					</div>

					<div className={styles.benefits}>
						{tier.benefits.map((benefit) => (
							<div key={benefit} className={styles.benefitItem}>
								<Check className={styles.benefitIcon} />
								{benefit}
							</div>
						))}
					</div>
				</Card>
			))}
		</div>
	);
};
