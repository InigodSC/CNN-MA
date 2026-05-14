// frontend/src/App.js
// Clasificador de Setas — Estética Pergamino / Manuscrito

import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";

const API_URL = "http://localhost:8000/predict";

// ── Paleta pergaminosa ──────────────────────────────────────────────────────
const P = {
  ink:        "#1C1208",   // tinta muy oscura
  inkMid:     "#3A2A14",   // tinta media
  inkLight:   "#6B4F2A",   // tinta suave
  parch:      "#F2E4C0",   // pergamino claro
  parchMid:   "#E5CFA0",   // pergamino medio
  parchDark:  "#CDB07A",   // pergamino oscuro
  parchDeep:  "#B8924A",   // pergamino profundo
  gold:       "#A07830",   // oro apagado
  goldLight:  "#C9A055",   // oro claro
  green:      "#2A4A1E",   // verde forestal
  greenBg:    "#D0E0B8",   // verde fondo
  red:        "#5A1010",   // rojo oscuro
  redBg:      "#DEC0B8",   // rojo fondo
};

// ── SVG Decoración de esquina ───────────────────────────────────────────────
const CornerDecor = () => (
  <svg viewBox="0 0 44 44" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3 L3 20 M3 3 L20 3" stroke={P.inkMid} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M7 7 L7 15 M7 7 L15 7" stroke={P.inkMid} strokeWidth="0.9" strokeLinecap="round"/>
    <circle cx="3" cy="3" r="1.8" fill={P.inkMid}/>
    <circle cx="7" cy="7" r="1" fill={P.inkMid} opacity="0.6"/>
    <path d="M11 3 Q15 7 20 3" stroke={P.inkMid} strokeWidth="0.9" fill="none"/>
    <path d="M3 11 Q7 15 3 20" stroke={P.inkMid} strokeWidth="0.9" fill="none"/>
    <path d="M14 3 L14 5" stroke={P.inkMid} strokeWidth="0.7" opacity="0.5"/>
    <path d="M3 14 L5 14" stroke={P.inkMid} strokeWidth="0.7" opacity="0.5"/>
  </svg>
);

// ── Icono Seta (trazo de tinta, sin relleno) ────────────────────────────────
const MushroomIcon = () => (
  <svg viewBox="0 0 60 72" width="54" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Sombrero */}
    <path d="M6 32 Q8 14 30 12 Q52 14 54 32" stroke={P.parch} strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="M6 32 Q14 38 30 38 Q46 38 54 32" stroke={P.parch} strokeWidth="2" fill="none"/>
    {/* Manchas decorativas */}
    <ellipse cx="16" cy="24" rx="4.5" ry="2.8" stroke={P.parch} strokeWidth="1" fill="none" opacity="0.7"/>
    <ellipse cx="30" cy="19" rx="3.5" ry="2.2" stroke={P.parch} strokeWidth="1" fill="none" opacity="0.7"/>
    <ellipse cx="44" cy="24" rx="4" ry="2.5" stroke={P.parch} strokeWidth="1" fill="none" opacity="0.7"/>
    {/* Tallo */}
    <path d="M22 38 L20 58" stroke={P.parch} strokeWidth="2" strokeLinecap="round"/>
    <path d="M38 38 L40 58" stroke={P.parch} strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 58 Q30 64 40 58" stroke={P.parch} strokeWidth="1.8" fill="none"/>
    {/* Volva */}
    <ellipse cx="30" cy="60" rx="12" ry="4.5" stroke={P.parch} strokeWidth="1.5" fill="none"/>
    {/* Líneas de sombreado */}
    <line x1="10" y1="27" x2="14" y2="33" stroke={P.parch} strokeWidth="0.5" opacity="0.45"/>
    <line x1="12" y1="25" x2="16" y2="31" stroke={P.parch} strokeWidth="0.5" opacity="0.45"/>
    <line x1="46" y1="27" x2="50" y2="32" stroke={P.parch} strokeWidth="0.5" opacity="0.45"/>
    <line x1="44" y1="25" x2="48" y2="30" stroke={P.parch} strokeWidth="0.5" opacity="0.45"/>
  </svg>
);

// ── Icono Archivo / Subida (trazo de tinta) ─────────────────────────────────
const UploadIcon = () => (
  <svg viewBox="0 0 36 36" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Hoja de papel con esquina doblada */}
    <path d="M6 4 L24 4 L30 10 L30 32 L6 32 Z" stroke={P.inkMid} strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
    <path d="M24 4 L24 10 L30 10" stroke={P.inkMid} strokeWidth="1.2" fill="none"/>
    {/* Flecha hacia arriba */}
    <line x1="18" y1="26" x2="18" y2="14" stroke={P.inkMid} strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M13 19 L18 14 L23 19" stroke={P.inkMid} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    {/* Línea base */}
    <line x1="12" y1="28" x2="24" y2="28" stroke={P.inkMid} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

// ── Icono Cámara (trazo de tinta) ───────────────────────────────────────────
const CameraIcon = () => (
  <svg viewBox="0 0 36 36" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cuerpo */}
    <rect x="3" y="10" width="30" height="20" rx="2" stroke={P.inkMid} strokeWidth="1.4" fill="none"/>
    {/* Montura del objetivo */}
    <path d="M13 10 L13 7 L23 7 L23 10" stroke={P.inkMid} strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
    {/* Objetivo */}
    <circle cx="18" cy="20" r="6.5" stroke={P.inkMid} strokeWidth="1.4" fill="none"/>
    <circle cx="18" cy="20" r="3.5" stroke={P.inkMid} strokeWidth="0.9" fill="none"/>
    {/* Cruz de enfoque */}
    <line x1="18" y1="13.5" x2="18" y2="15.5" stroke={P.inkMid} strokeWidth="0.9"/>
    <line x1="18" y1="24.5" x2="18" y2="26.5" stroke={P.inkMid} strokeWidth="0.9"/>
    <line x1="11.5" y1="20" x2="13.5" y2="20" stroke={P.inkMid} strokeWidth="0.9"/>
    <line x1="22.5" y1="20" x2="24.5" y2="20" stroke={P.inkMid} strokeWidth="0.9"/>
    {/* Visor */}
    <rect x="27" y="13" width="4" height="3" rx="0.5" stroke={P.inkMid} strokeWidth="0.9" fill="none"/>
  </svg>
);

// ── Estilos de confianza ────────────────────────────────────────────────────
function getConfidenceStyle(confidence) {
  if (confidence >= 66) return {
    color: P.green, bg: P.greenBg, border: "#4A7A2A",
    label: "Fiabilidad alta", symbol: "✦",
    hatch: `repeating-linear-gradient(45deg, #4A7A2A 0px, #4A7A2A 1px, transparent 1px, transparent 4px)`,
  };
  if (confidence >= 33) return {
    color: "#6A3A00", bg: "#EDD59A", border: "#9A720A",
    label: "Fiabilidad media", symbol: "◈",
    hatch: `repeating-linear-gradient(45deg, #9A720A 0px, #9A720A 1px, transparent 1px, transparent 4px)`,
  };
  return {
    color: P.red, bg: P.redBg, border: "#8A2020",
    label: "Fiabilidad baja", symbol: "⚠",
    hatch: `repeating-linear-gradient(45deg, #8A2020 0px, #8A2020 1px, transparent 1px, transparent 4px)`,
  };
}

const EDIBLE_STYLES = {
  comestible:      { color: P.green, bg: P.greenBg, border: "#4A7A2A", label: "✦ Comestible",    seal: "🌿" },
  "no comestible": { color: P.red,   bg: P.redBg,   border: "#8A2020", label: "✖ No Comestible", seal: "☠" },
  venenosa:        { color: P.red,   bg: P.redBg,   border: "#8A2020", label: "☠ Venenosa",       seal: "☠" },
  desconocido:     { color: "#4A3A00", bg: "#E8D8A0", border: "#7A6020", label: "? Sin determinar", seal: "?" },
};

// ── Panel Pergamino ─────────────────────────────────────────────────────────
function ParchmentPanel({ children, className = "" }) {
  return (
    <div className={`relative ${className}`} style={{
      background: `linear-gradient(135deg, #F0DFB8 0%, #E8CFA0 45%, #EDD9A8 70%, #E2C898 100%)`,
      border: `2px solid ${P.inkMid}`,
      boxShadow: `inset 0 0 40px rgba(28,18,8,0.10), 3px 3px 0 ${P.inkMid}`,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Vignette interior */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at center, transparent 60%, rgba(28,18,8,0.08) 100%)",
      }}/>
      {/* Esquinas */}
      <div style={{ position: "absolute", top: 3, left: 3, opacity: 0.65 }}><CornerDecor/></div>
      <div style={{ position: "absolute", top: 3, right: 3, transform: "scaleX(-1)", opacity: 0.65 }}><CornerDecor/></div>
      <div style={{ position: "absolute", bottom: 3, left: 3, transform: "scaleY(-1)", opacity: 0.65 }}><CornerDecor/></div>
      <div style={{ position: "absolute", bottom: 3, right: 3, transform: "scale(-1)", opacity: 0.65 }}><CornerDecor/></div>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

// ── Separador ornamental ────────────────────────────────────────────────────
function OrnamentalDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
      <div style={{ flex: 1, height: 1, background: P.inkMid, opacity: 0.35 }}/>
      <svg viewBox="0 0 40 10" width="40" height="10" fill="none">
        <circle cx="5"  cy="5" r="2" stroke={P.inkMid} strokeWidth="0.8" opacity="0.5"/>
        <circle cx="20" cy="5" r="2.8" stroke={P.inkMid} strokeWidth="1" fill={P.inkMid} opacity="0.4"/>
        <circle cx="35" cy="5" r="2" stroke={P.inkMid} strokeWidth="0.8" opacity="0.5"/>
        <line x1="8" y1="5" x2="16.5" y2="5" stroke={P.inkMid} strokeWidth="0.7" opacity="0.4"/>
        <line x1="23.5" y1="5" x2="32" y2="5" stroke={P.inkMid} strokeWidth="0.7" opacity="0.4"/>
      </svg>
      <div style={{ flex: 1, height: 1, background: P.inkMid, opacity: 0.35 }}/>
    </div>
  );
}

// ── Indicador de carga ──────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "36px 0" }}>
      <div style={{ position: "relative", width: 64, height: 64 }}>
        <svg viewBox="0 0 64 64" width="64" height="64" style={{ animation: "spin 3s linear infinite" }}>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <circle cx="32" cy="32" r="28" stroke={P.inkMid} strokeWidth="1" fill="none" strokeDasharray="5 4"/>
          <circle cx="32" cy="32" r="19" stroke={P.gold} strokeWidth="0.9" fill="none" strokeDasharray="2 6"/>
          <path d="M32 4 L35 13 L32 11 L29 13 Z" fill={P.inkMid}/>
          <path d="M32 60 L35 51 L32 53 L29 51 Z" fill={P.inkMid}/>
          <path d="M4 32 L13 35 L11 32 L13 29 Z" fill={P.inkMid}/>
          <path d="M60 32 L51 35 L53 32 L51 29 Z" fill={P.inkMid}/>
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MushroomIconSmall/>
        </div>
      </div>
      <p style={{ fontFamily: "'EB Garamond', Georgia, serif", color: P.inkMid, fontSize: 15, fontStyle: "italic", margin: 0, letterSpacing: "0.04em" }}>
        Analizando la muestra…
      </p>
    </div>
  );
}

// Seta pequeña para el spinner (sin color de header)
const MushroomIconSmall = () => (
  <svg viewBox="0 0 60 72" width="26" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 32 Q8 14 30 12 Q52 14 54 32" stroke={P.inkMid} strokeWidth="2.2" fill="none"/>
    <path d="M6 32 Q14 38 30 38 Q46 38 54 32" stroke={P.inkMid} strokeWidth="2.2" fill="none"/>
    <ellipse cx="16" cy="24" rx="4.5" ry="2.8" stroke={P.inkMid} strokeWidth="1.2" fill="none" opacity="0.6"/>
    <ellipse cx="30" cy="19" rx="3.5" ry="2.2" stroke={P.inkMid} strokeWidth="1.2" fill="none" opacity="0.6"/>
    <ellipse cx="44" cy="24" rx="4" ry="2.5" stroke={P.inkMid} strokeWidth="1.2" fill="none" opacity="0.6"/>
    <path d="M22 38 L20 58" stroke={P.inkMid} strokeWidth="2"/>
    <path d="M38 38 L40 58" stroke={P.inkMid} strokeWidth="2"/>
    <path d="M20 58 Q30 64 40 58" stroke={P.inkMid} strokeWidth="1.8" fill="none"/>
    <ellipse cx="30" cy="60" rx="12" ry="4.5" stroke={P.inkMid} strokeWidth="1.5" fill="none"/>
  </svg>
);

// ── Tarjeta de resultado ────────────────────────────────────────────────────
function ResultCard({ result }) {
  if (!result) return null;

  if (!result.identified) {
    return (
      <ParchmentPanel>
        <div style={{ padding: "24px 28px" }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <svg viewBox="0 0 40 40" width="36" height="36" fill="none" style={{ marginBottom: 8 }}>
              <circle cx="20" cy="20" r="16" stroke={P.inkLight} strokeWidth="1.5" fill="none"/>
              <text x="20" y="26" textAnchor="middle" fill={P.inkLight} fontSize="18" fontFamily="Georgia">?</text>
            </svg>
            <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 20, color: P.ink, fontStyle: "italic", margin: 0 }}>
              Especie no identificada
            </h2>
          </div>
          <OrnamentalDivider/>
          <p style={{ fontFamily: "'EB Garamond', Georgia, serif", color: "#4A3A2A", fontSize: 14, lineHeight: 1.8, textAlign: "center", fontStyle: "italic" }}>
            {result.message}
          </p>
          <p style={{ fontFamily: "Georgia, serif", color: "#7A6A5A", fontSize: 11, textAlign: "center", marginTop: 8 }}>
            Confianza registrada: {result.confidence}% — Mínimo requerido: {result.threshold}%
          </p>
          <OrnamentalDivider/>
          <p style={{ fontFamily: "Georgia, serif", color: "#7A6A5A", fontSize: 11, textAlign: "center", fontStyle: "italic" }}>
            Prueba con una fotografía más nítida o desde otro ángulo.
          </p>
        </div>
      </ParchmentPanel>
    );
  }

  const confStyle  = getConfidenceStyle(result.confidence);
  const edibleKey  = result.edible in EDIBLE_STYLES ? result.edible : "desconocido";
  const edibleStyle = EDIBLE_STYLES[edibleKey];

  return (
    <ParchmentPanel>
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Título especie */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: P.inkLight, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 4px" }}>
            — Especie identificada —
          </p>
          <h2 style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 22, color: P.ink, fontStyle: "italic", margin: 0, lineHeight: 1.3 }}>
            {result.species}
          </h2>
        </div>

        <OrnamentalDivider/>

        {/* Barra de fiabilidad */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 11, color: confStyle.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {confStyle.symbol} {confStyle.label}
            </span>
            <span style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 16, color: confStyle.color, fontWeight: "bold" }}>
              {result.confidence}%
            </span>
          </div>
          <div style={{ border: `1.5px solid ${P.inkMid}`, padding: 2, background: P.parchMid }}>
            <div style={{ height: 14, background: P.parchMid, position: "relative", overflow: "hidden" }}>
              <div style={{
                width: `${result.confidence}%`, height: "100%",
                backgroundImage: confStyle.hatch,
                backgroundColor: confStyle.bg,
                transition: "width 0.8s ease",
                borderRight: result.confidence > 0 ? `2px solid ${confStyle.border}` : "none",
              }}/>
            </div>
          </div>
          <div style={{ marginTop: 6, display: "flex", justifyContent: "center" }}>
            <span style={{
              fontFamily: "Georgia, serif", fontSize: 11,
              color: confStyle.color, background: confStyle.bg,
              border: `1px solid ${confStyle.border}`,
              padding: "2px 10px", letterSpacing: "0.08em",
            }}>
              {confStyle.symbol} {confStyle.label}
            </span>
          </div>
        </div>

        <OrnamentalDivider/>

        {/* Resultado de comestibilidad */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: edibleStyle.bg,
          border: `2px solid ${edibleStyle.border}`,
          padding: "10px 16px",
          position: "relative", overflow: "hidden",
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{edibleStyle.seal}</span>
          <div>
            <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: edibleStyle.color, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
              Resultado del análisis
            </p>
            <p style={{ fontFamily: "'EB Garamond', Georgia, serif", fontSize: 17, color: edibleStyle.color, fontStyle: "italic", margin: 0, fontWeight: "bold" }}>
              {edibleStyle.label}
            </p>
          </div>
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 20, opacity: 0.12,
            backgroundImage: `repeating-linear-gradient(45deg, ${edibleStyle.border} 0px, ${edibleStyle.border} 1px, transparent 1px, transparent 5px)`,
          }}/>
        </div>

        {/* Descripción */}
        {result.characteristics && (
          <>
            <OrnamentalDivider/>
            <div>
              <p style={{ fontFamily: "Georgia, serif", fontSize: 10, color: P.inkLight, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>
                ✦ Descripción de la especie ✦
              </p>
              <p style={{ fontFamily: "'EB Garamond', Georgia, serif", color: P.ink, fontSize: 15, lineHeight: 1.85, fontStyle: "italic", margin: 0 }}>
                {result.characteristics}
              </p>
            </div>
          </>
        )}
      </div>
    </ParchmentPanel>
  );
}

// ── App Principal ───────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode]                 = useState("upload");
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  const webcamRef    = useRef(null);
  const fileInputRef = useRef(null);

  const sendImage = useCallback(async (blob) => {
    setLoading(true); setResult(null); setError(null);
    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");
    try {
      const res = await fetch(API_URL, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null); setError(null);
    sendImage(file);
  };

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    setPreviewUrl(imageSrc);
    setCameraActive(false);
    fetch(imageSrc).then(r => r.blob()).then(blob => sendImage(blob));
  }, [sendImage]);

  const reset = () => {
    setPreviewUrl(null); setResult(null); setError(null);
    setCameraActive(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundImage: `url('/fondo.jpg')`,
      backgroundSize: "cover",
      backgroundAttachment: "fixed",
      backgroundPosition: "center",
      fontFamily: "Georgia, serif",
      position: "relative",
    }}>
      {/* Overlay oscuro muy suave sobre el fondo */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "rgba(28, 18, 8, 0.14)",
        zIndex: 0,
      }}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400;1,600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:hover { filter: brightness(1.08); }
      `}</style>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header style={{
        background: `linear-gradient(180deg, ${P.ink} 0%, ${P.inkMid} 100%)`,
        borderBottom: `3px solid ${P.gold}`,
        position: "relative",
        zIndex: 10,
        overflow: "hidden",
      }}>
        {/* Líneas doradas decorativas */}
        <div style={{ position: "absolute", bottom: 7, left: 0, right: 0, height: 1, background: P.gold, opacity: 0.35 }}/>
        <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, height: 1, background: P.goldLight, opacity: 0.18 }}/>

        <div style={{
          maxWidth: 920, margin: "0 auto", padding: "18px 24px",
          display: "flex", alignItems: "center", gap: 20,
          position: "relative", zIndex: 1,
        }}>
          <MushroomIcon/>
          <div>
            <h1 style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 30, color: P.parch, margin: 0,
              letterSpacing: "0.04em", fontStyle: "italic",
            }}>
              Identificador de Setas
            </h1>
            <p style={{
              color: P.goldLight, fontSize: 11, margin: "3px 0 0",
              letterSpacing: "0.22em", textTransform: "uppercase",
            }}>
              ✦ Reconocimiento de especies · 168 variedades ✦
            </p>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: 920, margin: "0 auto", padding: "28px 16px",
        display: "flex", flexDirection: "column", gap: 20,
        position: "relative", zIndex: 1,
      }}>

        {/* ── SELECTOR DE MODO ──────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{
            display: "flex",
            border: `2px solid ${P.inkMid}`,
            background: P.parchDark,
            boxShadow: `3px 3px 0 ${P.inkMid}`,
          }}>
            {[
              { key: "upload", icon: <UploadIcon/>, label: "Cargar imagen" },
              { key: "camera", icon: <CameraIcon/>, label: "Usar cámara" },
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => { setMode(key); reset(); }} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 22px",
                background: mode === key
                  ? `linear-gradient(180deg, ${P.ink} 0%, ${P.inkMid} 100%)`
                  : "transparent",
                color: mode === key ? P.parch : P.inkMid,
                border: "none",
                borderRight: key === "upload" ? `1px solid ${P.inkMid}` : "none",
                cursor: "pointer",
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: 15, fontStyle: "italic",
                letterSpacing: "0.03em",
                transition: "all 0.2s",
              }}>
                {/* Recolorear el icono si está activo */}
                <span style={{ filter: mode === key ? "brightness(10)" : "none", display: "flex" }}>
                  {icon}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── GRID PRINCIPAL ────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Panel izquierdo — Entrada */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {mode === "upload" && (
              <ParchmentPanel>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "40px 24px", textAlign: "center", cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                  }}
                >
                  <UploadIcon/>
                  <p style={{ fontFamily: "'EB Garamond', Georgia, serif", color: P.ink, fontSize: 16, fontStyle: "italic", margin: 0 }}>
                    Haz clic para seleccionar una imagen
                  </p>
                  <OrnamentalDivider/>
                  <p style={{ color: P.inkLight, fontSize: 11, margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    JPG · PNG · WEBP
                  </p>
                  <div style={{
                    marginTop: 8, border: `1.5px solid ${P.inkMid}`,
                    padding: "8px 22px",
                    background: `linear-gradient(180deg, ${P.ink} 0%, ${P.inkMid} 100%)`,
                    color: P.parch,
                    fontFamily: "'EB Garamond', Georgia, serif",
                    fontSize: 14, fontStyle: "italic", cursor: "pointer",
                    boxShadow: `2px 2px 0 ${P.gold}`,
                    letterSpacing: "0.05em",
                  }}>
                    ✦ Seleccionar foto
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange}/>
                </div>
              </ParchmentPanel>
            )}

            {mode === "camera" && (
              <ParchmentPanel>
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                  {cameraActive ? (
                    <>
                      <div style={{ border: `2px solid ${P.inkMid}`, overflow: "hidden" }}>
                        <Webcam
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          screenshotQuality={0.92}
                          videoConstraints={{ facingMode: "environment" }}
                          style={{ width: "100%", display: "block" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleCapture} style={{
                          flex: 1, padding: "10px 0",
                          background: `linear-gradient(180deg, ${P.ink} 0%, ${P.inkMid} 100%)`,
                          color: P.parch, border: `1.5px solid ${P.gold}`,
                          fontFamily: "'EB Garamond', Georgia, serif", fontSize: 15, fontStyle: "italic",
                          cursor: "pointer", boxShadow: `2px 2px 0 ${P.gold}`,
                        }}>✦ Tomar foto</button>
                        <button onClick={() => setCameraActive(false)} style={{
                          padding: "10px 16px", background: P.parchDark,
                          border: `1.5px solid ${P.inkMid}`, color: P.inkMid,
                          fontFamily: "Georgia, serif", fontSize: 13, cursor: "pointer",
                        }}>✖</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: "36px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                      <CameraIcon/>
                      <p style={{ fontFamily: "'EB Garamond', Georgia, serif", color: P.ink, fontSize: 15, fontStyle: "italic", margin: 0 }}>
                        Activa la cámara para fotografiar la seta
                      </p>
                      <button onClick={() => { reset(); setCameraActive(true); }} style={{
                        padding: "10px 26px",
                        background: `linear-gradient(180deg, ${P.ink} 0%, ${P.inkMid} 100%)`,
                        color: P.parch, border: `1.5px solid ${P.gold}`,
                        fontFamily: "'EB Garamond', Georgia, serif", fontSize: 15, fontStyle: "italic",
                        cursor: "pointer", boxShadow: `2px 2px 0 ${P.gold}`,
                      }}>✦ Activar cámara</button>
                    </div>
                  )}
                </div>
              </ParchmentPanel>
            )}

            {/* Preview de la imagen */}
            {previewUrl && (
              <div style={{ position: "relative", border: `2px solid ${P.inkMid}`, boxShadow: `3px 3px 0 ${P.inkMid}` }}>
                <img src={previewUrl} alt="Muestra" style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}/>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0,
                  height: 3, backgroundImage: `repeating-linear-gradient(90deg, ${P.gold} 0px, ${P.gold} 4px, transparent 4px, transparent 8px)`,
                }}/>
                <button onClick={reset} style={{
                  position: "absolute", top: 8, right: 8,
                  width: 28, height: 28, border: `1.5px solid ${P.inkMid}`,
                  background: P.parch, color: P.inkMid,
                  cursor: "pointer", fontFamily: "Georgia, serif", fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>✖</button>
              </div>
            )}
          </div>

          {/* Panel derecho — Resultado */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {loading && (
              <ParchmentPanel>
                <LoadingSpinner/>
              </ParchmentPanel>
            )}

            {error && !loading && (
              <ParchmentPanel>
                <div style={{ padding: "24px 28px", textAlign: "center" }}>
                  <svg viewBox="0 0 40 40" width="32" height="32" fill="none" style={{ marginBottom: 10 }}>
                    <path d="M20 8 L33 30 L7 30 Z" stroke={P.red} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                    <line x1="20" y1="17" x2="20" y2="24" stroke={P.red} strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="20" cy="27" r="1.2" fill={P.red}/>
                  </svg>
                  <p style={{ fontFamily: "'EB Garamond', Georgia, serif", color: P.red, fontSize: 17, fontStyle: "italic" }}>
                    Error de conexión
                  </p>
                  <OrnamentalDivider/>
                  <p style={{ color: P.red, fontSize: 12 }}>{error}</p>
                </div>
              </ParchmentPanel>
            )}

            {!loading && !error && !result && (
              <ParchmentPanel>
                <div style={{ padding: "44px 28px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <MushroomIconSmall/>
                  <p style={{ fontFamily: "'EB Garamond', Georgia, serif", color: P.inkLight, fontSize: 16, fontStyle: "italic", margin: 0 }}>
                    Los resultados aparecerán aquí…
                  </p>
                  <OrnamentalDivider/>
                  <p style={{ color: "#A08060", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Sube o fotografía una seta para empezar
                  </p>
                </div>
              </ParchmentPanel>
            )}

            {!loading && result && <ResultCard result={result}/>}
          </div>
        </div>

        {/* ── AVISO INFERIOR ──────────────────────────────────────────── */}
        <ParchmentPanel>
          <div style={{ padding: "14px 24px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M12 3 L21 19 L3 19 Z" stroke={P.inkMid} strokeWidth="1.4" fill="none" strokeLinejoin="round"/>
              <line x1="12" y1="10" x2="12" y2="15" stroke={P.inkMid} strokeWidth="1.3" strokeLinecap="round"/>
              <circle cx="12" cy="17.5" r="0.9" fill={P.inkMid}/>
            </svg>
            <p style={{ fontFamily: "'EB Garamond', Georgia, serif", color: P.ink, fontSize: 13, fontStyle: "italic", lineHeight: 1.75, margin: 0 }}>
              <strong>Aviso importante:</strong> Esta herramienta es solo orientativa y no reemplaza el criterio de un micólogo experto.
              No consumas ninguna seta basándote únicamente en este resultado.
            </p>
          </div>
        </ParchmentPanel>

      </main>
    </div>
  );
}