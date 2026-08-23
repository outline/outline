import { CheckCircleLinear as CheckIcon } from "solar-icon-set";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "../../useLanguage";
import { styles } from "./LanguageSwitcher.styles";

export function LanguageSwitcher() {
	const { language, changeLanguage, supportedLanguages } = useLanguage();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-[10px] font-bold uppercase text-neutral-900  active:scale-95 transition-all hover:bg-neutral-50"
					aria-label="Change language"
				>
					{language}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className={styles.dropdownContent}>
				{Object.entries(supportedLanguages).map(([key, code]) => (
					<DropdownMenuItem
						key={code}
						onClick={() => changeLanguage(code)}
						className={styles.item}
					>
						<span className={styles.itemLabel}>{key}</span>
						{language === code && <CheckIcon className={styles.itemCheck} />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
