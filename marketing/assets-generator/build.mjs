// Norte Tech — generador de piezas gráficas para redes
// HTML/CSS con fuentes de marca embebidas -> PNG vía Chrome headless.
// Uso: node marketing/assets-generator/build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..", "..");
const OUT = join(ROOT, "public", "marketing", "assets");
const TMP = join(__dir, ".tmp");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const b64 = (p) => readFileSync(p).toString("base64");
const font = (file) => b64(join(ROOT, "public/assets/fonts", file));
const FONTS = {
  bebas: font("BebasNeue-Regular.ttf"),
  mono: font("SpaceMono-Regular.ttf"),
  monoB: font("SpaceMono-Bold.ttf"),
  sans: font("DMSans-Regular.ttf"),
};
const LOGO = b64(join(ROOT, "public/assets/logo.png"));

const CSS = `
@font-face{font-family:'Bebas';src:url(data:font/ttf;base64,${FONTS.bebas}) format('truetype');}
@font-face{font-family:'Mono';font-weight:400;src:url(data:font/ttf;base64,${FONTS.mono}) format('truetype');}
@font-face{font-family:'Mono';font-weight:700;src:url(data:font/ttf;base64,${FONTS.monoB}) format('truetype');}
@font-face{font-family:'Sans';src:url(data:font/ttf;base64,${FONTS.sans}) format('truetype');}
*{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#05070A;--surf:#0D1217;--accent:#00E5A0;--accent2:#1FFDB6;
  --text:#E6EDF3;--muted:#8194A3;--border:#1A2128;--blue:#2196F3;
}
html,body{background:var(--bg);}
.stage{
  position:relative;overflow:hidden;color:var(--text);
  background-color:var(--bg);
  background-image:
    radial-gradient(900px 640px at 12% 6%, rgba(0,229,160,.13), transparent 60%),
    radial-gradient(760px 760px at 102% 104%, rgba(33,150,243,.07), transparent 60%),
    linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
  background-size:auto,auto,56px 56px,56px 56px;
}
.stage::after{content:"";position:absolute;inset:0;pointer-events:none;
  box-shadow:inset 0 0 220px rgba(0,0,0,.55);}
.frame{position:absolute;inset:0;display:flex;flex-direction:column;}
.top,.bot{display:flex;align-items:center;justify-content:space-between;}
.brand{display:flex;align-items:center;gap:16px;}
.brand img{height:var(--logo);width:var(--logo);filter:drop-shadow(0 0 10px rgba(0,229,160,.45));}
.brand .wm{font-family:'Mono';font-weight:700;letter-spacing:1px;}
.kick{font-family:'Mono';font-weight:700;color:var(--accent);text-transform:uppercase;
  letter-spacing:3px;display:inline-flex;align-items:center;gap:12px;}
.kick::before{content:"";width:26px;height:2px;background:var(--accent);box-shadow:0 0 12px var(--accent);}
.counter{font-family:'Mono';color:var(--muted);letter-spacing:2px;}
.counter b{color:var(--accent);font-weight:700;}
.title{font-family:'Bebas';line-height:.92;letter-spacing:1px;}
.g{color:var(--accent);text-shadow:0 0 28px rgba(0,229,160,.5);}
.sub{font-family:'Sans';color:var(--muted);line-height:1.45;}
.content{flex:1;display:flex;flex-direction:column;justify-content:center;}
.rule{height:2px;background:linear-gradient(90deg,var(--accent),transparent);box-shadow:0 0 16px rgba(0,229,160,.4);}
.swipe{font-family:'Mono';font-weight:700;color:var(--accent);letter-spacing:2px;}
.tagline{font-family:'Mono';color:var(--muted);letter-spacing:3px;text-transform:uppercase;}
.badge{font-family:'Bebas';color:var(--accent);border:2px solid rgba(0,229,160,.4);
  border-radius:14px;display:inline-flex;align-items:center;justify-content:center;
  box-shadow:0 0 0 1px rgba(0,229,160,.15),0 0 40px rgba(0,229,160,.12) inset;}
.pill{font-family:'Mono';font-weight:700;text-transform:uppercase;letter-spacing:2px;
  border:1px solid var(--border);border-radius:999px;display:inline-flex;align-items:center;}
.ctaBtn{font-family:'Mono';font-weight:700;background:var(--accent);color:#04130D;
  border-radius:14px;display:inline-flex;align-items:center;gap:14px;letter-spacing:1px;
  box-shadow:0 0 40px rgba(0,229,160,.35);}
`;

// ---------- frame helper (IG carousel 1080x1350) ----------
function igFrame({ counter, content, swipe = "DESLIZÁ →", logo = 40 }) {
  return `<div class="stage" style="width:1080px;height:1350px;--logo:${logo}px;">
    <div class="frame" style="padding:84px;">
      <div class="top">
        <div class="brand"><img src="data:image/png;base64,${LOGO}"/><span class="wm">bsasnortetech.vercel.app</span></div>
        <span class="counter">${counter}</span>
      </div>
      <div class="content">${content}</div>
      <div>
        <div class="rule"></div>
        <div class="bot" style="margin-top:26px;">
          <span class="tagline">BUILD THE FUTURE</span>
          <span class="swipe">${swipe}</span>
        </div>
      </div>
    </div>
  </div>`;
}

const num = (i, n) => `${String(i).padStart(2, "0")} <span style="color:var(--muted)">/</span> ${String(n).padStart(2, "0")}`;

// ===================== IG1 — Carrusel de lanzamiento =====================
const ig1 = [
  igFrame({
    counter: `<b>01</b> / 06`,
    logo: 44,
    content: `
      <span class="kick">v0.1 — comunidad tech</span>
      <h1 class="title" style="font-size:230px;margin-top:34px;">BUILD<br>THE <span class="g">FUTURE.</span></h1>
      <p class="sub" style="font-size:34px;margin-top:40px;max-width:760px;">Founders, devs y makers de la Zona Norte. Ahora en <span style="color:var(--text)">bsasnortetech.vercel.app</span></p>`,
  }),
  igFrame({
    counter: num(2, 6),
    content: `
      <span class="kick">whoami</span>
      <h1 class="title" style="font-size:120px;margin-top:40px;">ZONA NORTE TIENE TORRES, LAGOS…</h1>
      <h1 class="title" style="font-size:120px;margin-top:14px;">Y AHORA UNA <span class="g">COMUNIDAD TECH.</span></h1>`,
  }),
  igFrame({
    counter: num(3, 6),
    content: `
      <span class="kick">los builders</span>
      <h1 class="title" style="font-size:178px;margin-top:34px;line-height:.96;">FOUNDERS.<br>DEVS.<br>MAKERS.</h1>
      <p class="sub" style="font-size:38px;margin-top:44px;">Buildeando <span style="color:var(--accent)">desde el agua.</span></p>`,
  }),
  igFrame({
    counter: num(4, 6),
    content: `
      <span class="kick">la diferencia</span>
      <h1 class="title" style="font-size:128px;margin-top:40px;">NO ES OTRO GRUPO DE WHATSAPP.</h1>
      <h1 class="title" style="font-size:128px;margin-top:16px;">ES DONDE SE <span class="g">CONSTRUYE EN SERIO.</span></h1>`,
  }),
  igFrame({
    counter: num(5, 6),
    content: `
      <span class="kick">status: shipping</span>
      <div style="display:flex;align-items:baseline;gap:30px;margin-top:30px;">
        <!-- datos a octubre 2026: 261 miembros activos --><span class="title g" style="font-size:340px;">260+</span>
        <span class="title" style="font-size:120px;">MIEMBROS</span>
      </div>
      <p class="sub" style="font-size:40px;margin-top:30px;">Y esto <span style="color:var(--text)">recién arranca.</span></p>`,
  }),
  igFrame({
    counter: `<b>06</b> / 06`,
    swipe: "↗ LINK EN BIO",
    content: `
      <span class="kick">tu turno</span>
      <h1 class="title" style="font-size:170px;margin-top:34px;">¿LISTO PARA <span class="g">CONSTRUIR?</span></h1>
      <div style="margin-top:54px;display:flex;align-items:center;gap:28px;flex-wrap:wrap;">
        <span class="ctaBtn" style="font-size:40px;padding:26px 44px;">SUMATE GRATIS →</span>
        <span class="sub" style="font-size:34px;">bsasnortetech.vercel.app</span>
      </div>`,
  }),
];

// ===================== IG2 — Carrusel 4 pilares =====================
function pillarSlide(i, kick, title, desc) {
  return igFrame({
    counter: num(i + 1, 6),
    content: `
      <div style="display:flex;align-items:center;gap:40px;">
        <span class="badge" style="font-size:120px;width:170px;height:170px;">0${i}</span>
        <span class="kick">${kick}</span>
      </div>
      <h1 class="title" style="font-size:150px;margin-top:46px;">${title}</h1>
      <p class="sub" style="font-size:40px;margin-top:34px;max-width:840px;">${desc}</p>`,
  });
}
const ig2 = [
  igFrame({
    counter: num(1, 6),
    logo: 44,
    content: `
      <span class="kick">manifiesto</span>
      <h1 class="title" style="font-size:188px;margin-top:36px;">¿QUÉ ES <span class="g">NORTE TECH?</span></h1>
      <p class="sub" style="font-size:38px;margin-top:42px;max-width:820px;">4 cosas que vas a encontrar adentro. Deslizá →</p>`,
  }),
  pillarSlide(1, "startups & proyectos", "STARTUPS &amp; PROYECTOS", "Conectamos founders con co-founders, early hires y primeros usuarios. Tu próximo socio puede vivir a 5 minutos."),
  pillarSlide(2, "conocimiento", "CONOCIMIENTO", "Workshops técnicos, talks de founders y sesiones de Q&amp;A. Aprendés de gente que ya lo hizo."),
  pillarSlide(3, "red de contactos", "RED DE CONTACTOS", "Inversores, mentores y corporaciones de zona norte. Puertas que tardás años en abrir, acá se abren en un asado."),
  pillarSlide(4, "acción real", "ACCIÓN REAL", "No es otro grupo de WhatsApp. Construimos cosas juntos. Charlar está bien; shippear está mejor."),
  igFrame({
    counter: `<b>06</b> / 06`,
    swipe: "↗ LINK EN BIO",
    content: `
      <span class="kick">sumate</span>
      <h1 class="title" style="font-size:160px;margin-top:34px;">CONSTRUÍ EL FUTURO <span class="g">DESDE EL AGUA.</span></h1>
      <div style="margin-top:54px;display:flex;align-items:center;gap:28px;flex-wrap:wrap;">
        <span class="ctaBtn" style="font-size:40px;padding:26px 44px;">SUMATE GRATIS →</span>
        <span class="sub" style="font-size:34px;">bsasnortetech.vercel.app</span>
      </div>`,
  }),
];

// ===================== X header (1500x500) =====================
const xHeader = `<div class="stage" style="width:1500px;height:500px;--logo:104px;">
  <div class="frame" style="padding:60px 76px;flex-direction:row;align-items:center;justify-content:space-between;gap:60px;">
    <div>
      <span class="kick" style="font-size:22px;">comunidad tech · zona norte ba</span>
      <h1 class="title" style="font-size:124px;margin-top:18px;">BUILD THE <span class="g">FUTURE.</span></h1>
      <span class="wm" style="font-family:'Mono';font-weight:700;color:var(--muted);font-size:30px;letter-spacing:1px;">bsasnortetech.vercel.app</span>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:26px;">
      <img src="data:image/png;base64,${LOGO}" style="height:160px;width:160px;filter:drop-shadow(0 0 22px rgba(0,229,160,.5));"/>
      <div style="display:flex;gap:14px;">
        ${["FOUNDERS", "DEVS", "MAKERS"].map((t) => `<span class="pill" style="font-size:20px;padding:12px 20px;color:var(--accent);border-color:rgba(0,229,160,.4);">${t}</span>`).join("")}
      </div>
    </div>
  </div>
</div>`;

// ===================== Story (1080x1920) — Sumate =====================
const story = `<div class="stage" style="width:1080px;height:1920px;--logo:64px;">
  <div class="frame" style="padding:120px 90px;">
    <div class="top">
      <div class="brand"><img src="data:image/png;base64,${LOGO}"/><span class="wm" style="font-size:30px;">bsasnortetech.vercel.app</span></div>
    </div>
    <div class="content">
      <span class="kick" style="font-size:30px;">comunidad tech · zona norte</span>
      <h1 class="title" style="font-size:240px;margin-top:40px;">BUILD<br>THE <span class="g">FUTURE.</span></h1>
      <p class="sub" style="font-size:44px;margin-top:50px;max-width:840px;">Founders, devs y makers construyendo startups desde el agua. No es otro grupo de WhatsApp.</p>
      <div style="margin-top:64px;"><span class="ctaBtn" style="font-size:46px;padding:30px 50px;">SUMATE GRATIS →</span></div>
    </div>
    <div>
      <div class="rule"></div>
      <div class="bot" style="margin-top:30px;">
        <span class="tagline" style="font-size:26px;">bsasnortetech.vercel.app</span>
        <span class="swipe" style="font-size:30px;">DESLIZÁ ↑</span>
      </div>
    </div>
  </div>
</div>`;

// ---------- render ----------
function shoot(name, w, h, body) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`;
  const htmlPath = join(TMP, name + ".html");
  const pngPath = join(OUT, name + ".png");
  writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--hide-scrollbars", "--no-sandbox",
    "--force-device-scale-factor=2",
    `--window-size=${w},${h}`,
    "--virtual-time-budget=2000",
    "--default-background-color=00000000",
    `--screenshot=${pngPath}`,
    "file://" + htmlPath,
  ], { stdio: "ignore" });
  return pngPath;
}

const jobs = [
  ...ig1.map((b, i) => [`ig1-lanzamiento-${String(i + 1).padStart(2, "0")}`, 1080, 1350, b]),
  ...ig2.map((b, i) => [`ig2-pilares-${String(i + 1).padStart(2, "0")}`, 1080, 1350, b]),
  ["x-header", 1500, 500, xHeader],
  ["story-sumate", 1080, 1920, story],
];

for (const [name, w, h, body] of jobs) {
  shoot(name, w, h, body);
  console.log("✓", name + ".png  (" + w * 2 + "×" + h * 2 + ")");
}
rmSync(TMP, { recursive: true, force: true });
console.log("\nListo →", OUT);
