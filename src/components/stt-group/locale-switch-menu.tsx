import { useServerFn } from "@tanstack/react-start";
import { Languages } from "lucide-react";
import * as React from "react";
import { useDismissibleLayer } from "#/hooks/use-dismissible-layer";
import { type ProductLocale, updateLocale, useLocale, useT } from "#/lib/i18n";

export function LocaleSwitchMenu({
	buttonClassName,
	menuClassName = "pop right",
	optionClassName = "pop-item",
	checkClassName = "pop-meta",
	optionContentClassName = "pop-item-main",
	menuRole = "menu",
	icon,
	open: controlledOpen,
	onOpenChange,
}: {
	buttonClassName: string;
	menuClassName?: string;
	optionClassName?: string;
	checkClassName?: string;
	optionContentClassName?: string;
	menuRole?: "menu" | "listbox";
	icon?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const { locale, setLocale } = useLocale();
	const t = useT();
	const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
	const updateLocaleFn = useServerFn(updateLocale);
	const open = controlledOpen ?? uncontrolledOpen;
	const setOpen = React.useCallback(
		(next: boolean | ((current: boolean) => boolean)) => {
			const resolvedNext = typeof next === "function" ? next(open) : next;
			onOpenChange?.(resolvedNext);
			if (controlledOpen === undefined) {
				setUncontrolledOpen(resolvedNext);
			}
		},
		[controlledOpen, onOpenChange, open],
	);
	const containerRef = useDismissibleLayer({
		open,
		onDismiss: () => setOpen(false),
	});
	const options: ProductLocale[] = ["zh-CN", "en-US"];

	const handleSelect = async (nextLocale: ProductLocale) => {
		if (nextLocale === locale) {
			setOpen(false);
			return;
		}

		await updateLocaleFn({ data: { locale: nextLocale } });
		setLocale(nextLocale);
		setOpen(false);
		document.documentElement.lang = nextLocale;
		document.title = t("app.title");
	};

	return (
		<div className="pop-anchor" ref={containerRef}>
			<button
				className={buttonClassName}
				type="button"
				aria-haspopup={menuRole}
				aria-expanded={open}
				aria-label={t("common.localeMenuLabel")}
				onClick={() => setOpen((current) => !current)}
			>
				{icon ?? <Languages size={16} />}
			</button>
			{open ? (
				menuRole === "listbox" ? (
					<div
						className={menuClassName}
						role="listbox"
						aria-label={t("common.localeMenuLabel")}
					>
						{options.map((option) => {
							const selected = locale === option;
							const label =
								option === "zh-CN"
									? t("common.localeOptionZhCN")
									: t("common.localeOptionEnUS");
							return (
								<button
									key={option}
									className={
										selected ? `${optionClassName} selected` : optionClassName
									}
									type="button"
									role="option"
									aria-selected={selected}
									data-selected={selected}
									onClick={() => void handleSelect(option)}
								>
									<span className={optionContentClassName}>
										<span>{label}</span>
									</span>
									<span className={checkClassName} aria-hidden="true">
										✓
									</span>
								</button>
							);
						})}
					</div>
				) : (
					<div className={menuClassName} role="menu">
						{options.map((option) => {
							const selected = locale === option;
							const label =
								option === "zh-CN"
									? t("common.localeOptionZhCN")
									: t("common.localeOptionEnUS");
							return (
								<button
									key={option}
									className={
										selected ? `${optionClassName} selected` : optionClassName
									}
									type="button"
									role="menuitemradio"
									aria-checked={selected}
									data-selected={selected}
									onClick={() => void handleSelect(option)}
								>
									<span className={optionContentClassName}>
										<span>{label}</span>
									</span>
									<span className={checkClassName} aria-hidden="true">
										✓
									</span>
								</button>
							);
						})}
					</div>
				)
			) : null}
		</div>
	);
}
