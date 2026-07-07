import { Camera, CameraOff, Mic, MicOff, PhoneOff } from "lucide-react";
import { useT } from "#/lib/i18n";

export type ControlDockProps = {
	visible: boolean;
	microphoneMuted: boolean;
	cameraEnabled: boolean;
	busy: boolean;
	canStop: boolean;
	onToggleMicrophone: () => void;
	onToggleCamera: () => void;
	onStop: () => void;
};

export function ControlDock({
	visible,
	microphoneMuted,
	cameraEnabled,
	busy,
	canStop,
	onToggleMicrophone,
	onToggleCamera,
	onStop,
}: ControlDockProps) {
	const t = useT();
	if (!visible) {
		return null;
	}

	return (
		<div
			className="dock stt-control-dock stt-control-dock--session"
			role="toolbar"
			aria-label={t("dock.toolbar")}
		>
			<div className="dock-cluster">
				<button
					className={microphoneMuted ? "dock-btn" : "dock-btn active"}
					type="button"
					aria-label={microphoneMuted ? t("dock.unmute") : t("dock.mute")}
					disabled={busy}
					onClick={onToggleMicrophone}
				>
					<span className="dock-icon">
						{microphoneMuted ? <MicOff /> : <Mic />}
					</span>
				</button>
			</div>
			<div className="dock-cluster">
				<button
					className={cameraEnabled ? "dock-btn active" : "dock-btn"}
					type="button"
					aria-label={
						cameraEnabled ? t("dock.disableCamera") : t("dock.enableCamera")
					}
					disabled={busy}
					onClick={onToggleCamera}
				>
					<span className="dock-icon">
						{cameraEnabled ? <Camera /> : <CameraOff />}
					</span>
				</button>
			</div>
			<span className="dock-divider stt-control-dock__divider" />
			<button
				className="dock-btn dock-hangup stt-control-dock__hangup"
				type="button"
				aria-label={t("dock.hangup")}
				disabled={!canStop || busy}
				onClick={onStop}
			>
				<PhoneOff />
			</button>
		</div>
	);
}
