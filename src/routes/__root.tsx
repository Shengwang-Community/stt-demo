import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type * as React from "react";
import logoUrl from "#/assets/agora-logo.svg?url";
import { getInitialLocale, getMessages, LocaleProvider } from "#/lib/i18n";

import appCss from "../styles.css?url";

const criticalLandingCss = `
:root{--bg:#05070b;--line:rgba(190,205,230,.09);--line-strong:rgba(210,225,250,.16);--ink:#f8fbff;--ink-2:#dbe5f2;--ink-3:#9aa9bd;--ink-4:#647286;--brand:#246bfe;--live:#21e6c5;--f-sans:"MiSans Latin","MiSans","Noto Sans SC",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--f-mono:"JetBrains Mono","SF Mono",Menlo,Consolas,monospace;--r-pill:999px;--r-xl:26px;--control-radius:10px;--control-bg:rgba(255,255,255,.035);--control-border:rgba(210,225,250,.11)}
body{margin:0;background:#05070b;overflow-x:hidden}
:where(.stt-landing-page){min-height:100vh;color:var(--ink);font-family:var(--f-sans);background:radial-gradient(circle at 18% -10%,rgba(36,107,254,.24),transparent 32%),radial-gradient(circle at 82% 8%,rgba(33,230,197,.12),transparent 28%),radial-gradient(circle at 68% 112%,rgba(244,184,96,.08),transparent 26%),var(--bg);overflow:hidden}
:where(.stt-landing-page *){box-sizing:border-box}
:where(.stt-landing-page button){font:inherit;cursor:pointer;border:0;background:none;padding:0}
:where(.stt-landing-page .mono){font-family:var(--f-mono)}
:where(.stt-landing-page .bg-fx){position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
:where(.stt-landing-page .bg-vignette){position:absolute;inset:0;background:linear-gradient(103deg,transparent 0 62%,rgba(218,235,255,.13) 69%,rgba(144,178,255,.22) 77%,rgba(72,104,178,.12) 86%,transparent 97%),radial-gradient(ellipse 16% 86% at 88% -7%,rgba(247,252,255,.18),rgba(175,207,255,.25) 18%,rgba(93,133,219,.17) 44%,rgba(44,64,116,.08) 68%,transparent 86%),radial-gradient(ellipse 20% 74% at 93% 44%,rgba(193,219,255,.13),rgba(112,151,235,.12) 42%,transparent 78%),radial-gradient(ellipse 54% 42% at 55% 86%,rgba(178,95,220,.32),rgba(95,87,212,.18) 46%,transparent 78%),radial-gradient(ellipse 38% 34% at 13% 78%,rgba(0,229,255,.1),transparent 72%),linear-gradient(90deg,rgba(2,4,8,.98) 0%,rgba(8,12,22,.96) 43%,rgba(29,38,61,.82) 70%,rgba(4,7,12,.98) 100%)}
:where(.stt-landing-page .bg-grid){position:absolute;inset:0;background-image:radial-gradient(circle,rgba(6,10,18,.58) 1.35px,transparent 1.5px);background-size:13px 13px;opacity:.56;mask-image:radial-gradient(ellipse 44% 32% at 37% 40%,transparent 0 38%,rgba(0,0,0,.42) 57%,#000 84%),linear-gradient(90deg,rgba(0,0,0,.42),#000 55%,#000);-webkit-mask-image:radial-gradient(ellipse 44% 32% at 37% 40%,transparent 0 38%,rgba(0,0,0,.42) 57%,#000 84%),linear-gradient(90deg,rgba(0,0,0,.42),#000 55%,#000);mask-composite:intersect;-webkit-mask-composite:source-in}
:where(.stt-landing-page .bg-grid)::before{content:"";position:absolute;inset:0;background:linear-gradient(104deg,transparent 0 64%,rgba(232,244,255,.13) 72%,rgba(126,166,255,.15) 81%,transparent 96%),radial-gradient(ellipse 36% 30% at 54% 83%,rgba(206,98,230,.18),transparent 74%);mix-blend-mode:screen;opacity:.68}
:where(.stt-landing-page .bg-glow){position:absolute;border-radius:50%;filter:blur(140px)}
:where(.stt-landing-page .bg-glow--brand){width:760px;height:760px;left:-18%;top:-26%;opacity:.44;background:radial-gradient(circle,rgba(36,107,254,.54),transparent 68%)}
:where(.stt-landing-page .bg-glow--cyan){right:-9%;top:-18%;width:360px;height:1180px;border-radius:46% 54% 58% 42%/18% 18% 82% 82%;background:linear-gradient(180deg,rgba(244,251,255,.26),rgba(162,199,255,.24) 28%,rgba(83,128,214,.13) 58%,transparent 86%);opacity:.43;filter:blur(140px)}
:where(.stt-landing-page .bg-pointer){position:absolute;left:var(--pointer-x,72vw);top:var(--pointer-y,36vh);width:320px;height:320px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,rgba(232,244,255,.24) 0%,rgba(128,180,255,.16) 26%,rgba(58,110,205,.08) 52%,transparent 72%);filter:blur(26px);mix-blend-mode:screen;opacity:0;transition:opacity .28s cubic-bezier(.22,.72,.2,1)}
body.pointer-active :where(.stt-landing-page .bg-pointer){opacity:1}
:where(.stt-landing-page .landing){position:relative;z-index:1;min-height:100vh;display:grid;grid-template-rows:auto 1fr;padding:24px 40px 34px;gap:0}
:where(.stt-landing-page .land-bar){display:flex;justify-content:space-between;align-items:center;height:52px;margin:0 auto 28px;max-width:1480px;width:100%;padding:0 4px}
:where(.stt-landing-page .brand,.stt-landing-page .land-actions){display:inline-flex;align-items:center;gap:10px}
:where(.stt-landing-page .brand-mark){width:auto;height:auto;background:transparent;box-shadow:none;overflow:visible;color:#20a4ff;border-radius:0}
:where(.stt-landing-page .brand-logo){height:24px;max-width:none;width:auto}
:where(.stt-landing-page .brand-name){font-size:14px;font-weight:600;letter-spacing:-.02em}
:where(.stt-landing-page .icon-btn){width:34px;height:34px;border-radius:10px;display:inline-grid;place-items:center;background:var(--control-bg);border:1px solid var(--control-border);color:var(--ink-2);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
:where(.stt-landing-page .icon-btn svg){width:18px;height:18px}
:where(.stt-landing-page .land-login-btn){min-width:92px;height:34px;padding:0 14px;border-radius:10px;color:#071018;background:linear-gradient(180deg,#fff,#dde6f2);border:1px solid rgba(255,255,255,.88);display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:600}
:where(.stt-landing-page .land-user-avatar){width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);border:1px solid rgba(255,255,255,.24);color:#172033;font-size:13px;font-weight:700}
:where(.stt-landing-page .land-main){display:grid;grid-template-columns:minmax(430px,.96fr) minmax(0,1.24fr);gap:clamp(44px,6vw,92px);align-items:center;max-width:1540px;width:100%;margin:0 auto;padding-top:12px}
:where(.stt-landing-page .land-copy){position:relative;padding:18px 0 20px}
:where(.stt-landing-page .land-kicker){display:inline-flex;align-items:center;gap:10px;padding:6px 12px;border-radius:var(--r-pill);background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.14);font-size:10px;font-family:var(--f-mono);letter-spacing:.18em;color:rgba(255,255,255,.72);margin-bottom:28px}
:where(.stt-landing-page .dot-live){width:8px;height:8px;border-radius:999px;display:inline-block;background:rgba(255,255,255,.86);box-shadow:0 0 0 4px rgba(255,255,255,.1),0 0 18px rgba(255,255,255,.34)}
:where(.stt-landing-page .dot-live.small){width:7px;height:7px;background:var(--live);box-shadow:0 0 0 4px rgba(33,230,197,.11)}
:where(.stt-landing-page .land-headline){margin:0 0 24px;font-size:clamp(48px,5.4vw,80px);max-width:760px;font-weight:650;line-height:1.12;letter-spacing:-.045em;color:var(--ink);text-wrap:balance}
:where(.stt-landing-page .land-sub){margin:0 0 22px;font-size:16px;line-height:1.65;color:#c7d5e8;max-width:58ch}
:where(.stt-landing-page .land-cta){display:flex;gap:10px}
:where(.stt-landing-page .land-cta .btn-primary){position:relative;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;height:52px;padding:0 56px 0 24px;border-radius:var(--r-pill);font-size:14px;font-weight:600;line-height:1;letter-spacing:-.005em;gap:0;width:fit-content;background:var(--brand);color:#fff}
:where(.stt-landing-page .cta-label){position:relative;z-index:1}
:where(.stt-landing-page .cta-icon){position:absolute;right:4px;z-index:2;width:44px;height:44px;border-radius:var(--r-pill);display:grid;place-items:center;overflow:hidden;background:#fff;color:#071018;box-shadow:inset 0 1px 0 rgba(255,255,255,.42)}
:where(.stt-landing-page .cta-icon svg){grid-area:1/1;display:block}
:where(.stt-landing-page .cta-icon-right){opacity:0;transform:translateX(-6px) rotate(-16deg)}
:where(.stt-landing-page .land-visual){position:relative;min-height:560px;display:flex;align-items:center;justify-content:stretch}
:where(.stt-landing-page .snip){position:relative;width:100%;height:min(66vh,620px);min-height:520px;border-radius:var(--r-xl);overflow:hidden;background:radial-gradient(ellipse at 54% 0%,rgba(36,107,254,.25),transparent 56%),radial-gradient(ellipse at 28% 100%,rgba(33,230,197,.1),transparent 56%),linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.01)),rgba(8,12,18,.92);border:1px solid rgba(210,225,250,.15);box-shadow:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px rgba(255,255,255,.018),0 54px 120px -34px rgba(0,0,0,.86),0 18px 58px -26px rgba(36,107,254,.55);mask-image:linear-gradient(180deg,#000 0%,#000 86%,transparent 100%);display:grid;grid-template-columns:minmax(0,1fr) 140px;grid-template-rows:50px minmax(0,1fr);grid-template-areas:"topbar topbar" "stage side"}
:where(.stt-landing-page .snip)::before{content:"";position:absolute;inset:50px 140px auto 0;height:1px;background:linear-gradient(90deg,transparent,rgba(33,230,197,.44),transparent);z-index:2}
:where(.stt-landing-page .snip-topbar,.stt-landing-page .snip-brand,.stt-landing-page .snip-status,.stt-landing-page .snip-speaker-sub,.stt-landing-page .snip-dock){display:flex;align-items:center}
:where(.stt-landing-page .snip-topbar){grid-area:topbar;justify-content:space-between;gap:12px;padding:10px 18px;border-bottom:1px solid var(--line);background:rgba(11,15,22,.58)}
:where(.stt-landing-page .snip-brand){gap:10px}
:where(.stt-landing-page .snip-mark){width:22px;height:22px;border-radius:6px;background:var(--brand);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 4px 12px -2px rgba(94,106,210,.4)}
:where(.stt-landing-page .snip-brand strong){display:block;font-size:11.5px;font-weight:600;letter-spacing:-.005em;color:var(--ink)}
:where(.stt-landing-page .snip-room){display:block;font-family:var(--f-mono);font-size:9px;letter-spacing:.16em;color:var(--ink-4);margin-top:1px}
:where(.stt-landing-page .snip-status){gap:8px;padding:5px 11px;border-radius:var(--r-pill);background:rgba(33,230,197,.08);border:1px solid rgba(33,230,197,.22);font-size:10px;color:var(--ink-2)}
:where(.stt-landing-page .snip-divider){width:1px;height:10px;background:rgba(255,255,255,.14)}
:where(.stt-landing-page .snip-status .mono){color:#aaf8ec;font-size:10px;letter-spacing:.06em}
:where(.stt-landing-page .snip-stage){transform:translateY(-56px);grid-area:stage;padding:30px 36px 28px;display:grid;align-content:end;gap:14px}
:where(.stt-landing-page .snip-speaker){display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px}
:where(.stt-landing-page .snip-avatar){width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--av);color:#172033;font-size:14px;font-weight:600}
:where(.stt-landing-page .snip-speaker-meta strong){display:block;font-size:13px;font-weight:600;letter-spacing:-.005em}
:where(.stt-landing-page .snip-speaker-sub span){display:block;font-family:var(--f-mono);font-size:9px;letter-spacing:.16em;color:var(--ink-3)}
:where(.stt-landing-page .snip-wave){display:inline-flex;align-items:end;gap:2px;height:12px;margin-left:9px}
:where(.stt-landing-page .snip-wave span){width:2px;border-radius:999px;background:rgba(91,157,255,.72);box-shadow:0 0 6px rgba(91,157,255,.28)}
:where(.stt-landing-page .snip-wave span:nth-child(1),.stt-landing-page .snip-wave span:nth-child(7)){height:4px}
:where(.stt-landing-page .snip-wave span:nth-child(2)){height:9px}
:where(.stt-landing-page .snip-wave span:nth-child(3)){height:6px}
:where(.stt-landing-page .snip-wave span:nth-child(4)){height:11px}
:where(.stt-landing-page .snip-wave span:nth-child(5)){height:5px}
:where(.stt-landing-page .snip-wave span:nth-child(6)){height:8px}
:where(.stt-landing-page .snip-original){font-size:clamp(22px,2.2vw,32px);font-weight:600;line-height:1.16;letter-spacing:-.035em;color:var(--ink)}
:where(.stt-landing-page .snip-translation){font-size:13px;line-height:1.55;color:#c3d2e5;max-width:60ch}
:where(.stt-landing-page .snip-side){grid-area:side;padding:16px 12px 16px 14px;border-left:1px solid var(--line);background:rgba(11,15,22,.58);display:grid;align-content:start;gap:12px;font-size:11px}
:where(.stt-landing-page .snip-side-head){font-family:var(--f-mono);font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
:where(.stt-landing-page .snip-side-rows){display:grid;gap:8px}
:where(.stt-landing-page .snip-side-row){display:grid;grid-template-columns:18px 1fr;gap:8px;align-items:center;color:var(--ink-2);font-size:11px}
:where(.stt-landing-page .snip-side-row span){width:18px;height:18px;border-radius:5px;background:rgba(255,255,255,.06)}
:where(.stt-landing-page .snip-side-row.active){color:var(--ink)}
:where(.stt-landing-page .snip-side-row.active span){background:var(--brand);box-shadow:0 0 0 1px rgba(0,229,255,.4)}
:where(.stt-landing-page .snip-dock){position:absolute;left:50%;bottom:50px;transform:translateX(-50%);gap:6px;padding:5px;border-radius:var(--r-pill);background:rgba(8,9,11,.7);border:1px solid var(--line-strong);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 14px 32px -6px rgba(0,0,0,.6)}
:where(.stt-landing-page .snip-dock-btn){width:32px;height:28px;border-radius:var(--r-pill);background:rgba(255,255,255,.05);border:1px solid var(--line);display:grid;place-items:center;color:rgba(235,241,255,.78)}
:where(.stt-landing-page .snip-dock-btn.danger){background:linear-gradient(180deg,#f0566a,#c63548);border-color:rgba(255,175,175,.3);color:#fff}
@media(max-width:1180px){:where(.stt-landing-page .land-main){grid-template-columns:1fr;gap:32px;max-width:900px}:where(.stt-landing-page .land-visual){min-height:480px}:where(.stt-landing-page .snip){height:500px}}
@media(max-width:860px){:where(.stt-landing-page .landing){padding:18px 18px 24px}:where(.stt-landing-page .land-bar){margin-bottom:22px}:where(.stt-landing-page .land-main){gap:24px;padding-top:0}:where(.stt-landing-page .land-headline){font-size:clamp(42px,13vw,58px)}:where(.stt-landing-page .land-sub){font-size:15px;line-height:1.6}:where(.stt-landing-page .snip){height:440px;grid-template-columns:1fr;grid-template-areas:"topbar" "stage"}:where(.stt-landing-page .snip-side){display:none}}
`;

export const Route = createRootRoute({
	loader: () => getInitialLocale(),
	head: ({ loaderData }) => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: getMessages(loaderData).app.title,
			},
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				type: "image/svg+xml",
				href: logoUrl,
			},
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const locale = Route.useLoaderData();

	return (
		<html lang={locale}>
			<head>
				<style
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Critical CSS is static and prevents unstyled SSR first paint.
					dangerouslySetInnerHTML={{ __html: criticalLandingCss }}
				/>
				<HeadContent />
			</head>
			<body>
				<LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
				<Scripts />
			</body>
		</html>
	);
}
