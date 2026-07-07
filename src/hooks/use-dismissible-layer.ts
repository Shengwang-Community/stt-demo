import * as React from "react";

export const useDismissibleLayer = ({
	open,
	onDismiss,
}: {
	open: boolean;
	onDismiss: () => void;
}) => {
	const containerRef = React.useRef<HTMLDivElement | null>(null);

	React.useEffect(() => {
		if (!open) {
			return;
		}

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (target instanceof Node && containerRef.current?.contains(target)) {
				return;
			}
			onDismiss();
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onDismiss();
			}
		};

		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleEscape);
		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [onDismiss, open]);

	return containerRef;
};
