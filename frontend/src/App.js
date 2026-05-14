// frontend/src/App.js
// Clasificador de Setas — React + Tailwind CSS + react-webcam
// npm install react-webcam axios

import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";

const API_URL = "https://cnn-ma-backend.onrender.com/predict";

// ── Paleta & constantes ────────────────────────────────────────────────────
const EDIBLE_STYLES = {
  comestible:      { badge: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500", label: "Comestible" },
  "no comestible": { badge: "bg-red-100 text-red-800 border-red-300",            dot: "bg-red-500",     label: "No comestible" },
  desconocido:     { badge: "bg-amber-100 text-amber-800 border-amber-300",       dot: "bg-amber-400",  label: "Estado desconocido" },
};

// ── Componente Spinner ─────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <div className="w-14 h-14 rounded-full border-4 border-stone-200 border-t-green-700 animate-spin" />
      <p className="text-stone-500 text-sm font-medium tracking-wide">Analizando seta…</p>
    </div>
  );
}

// ── Componente ResultCard ──────────────────────────────────────────────────
function ResultCard({ result }) {
  if (!result) return null;

  if (!result.identified) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <h2 className="text-lg font-semibold text-amber-800">No identificada</h2>
        </div>
        <p className="text-amber-700 text-sm">{result.message}</p>
        <p className="text-amber-500 text-xs">
          Confianza obtenida: <strong>{result.confidence}%</strong> — umbral mínimo: {result.threshold}%
        </p>
        <p className="text-amber-600 text-xs italic">
          Intenta con una foto más nítida, mejor iluminada o más centrada en la seta.
        </p>
      </div>
    );
  }

  const edibleKey = result.edible in EDIBLE_STYLES ? result.edible : "desconocido";
  const edibleStyle = EDIBLE_STYLES[edibleKey];

  return (
    <div className="rounded-2xl bg-white border border-stone-200 shadow-sm overflow-hidden">
      {/* Header especie */}
      <div className="bg-gradient-to-r from-green-800 to-green-700 px-6 py-4">
        <p className="text-green-200 text-xs uppercase tracking-widest font-medium mb-1">
          Especie identificada
        </p>
        <h2 className="text-white text-xl font-bold italic leading-tight">
          {result.species}
        </h2>
      </div>

      <div className="px-6 py-5 flex flex-col gap-4">
        {/* Confianza */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-stone-500 font-medium uppercase tracking-wide">
              Confianza
            </span>
            <span className="text-sm font-bold text-green-700">{result.confidence}%</span>
          </div>
          <div className="w-full bg-stone-100 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-700"
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>

        {/* Badge comestibilidad */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-semibold ${edibleStyle.badge}`}
          >
            <span className={`w-2 h-2 rounded-full ${edibleStyle.dot}`} />
            {edibleStyle.label}
          </span>
        </div>

        {/* Características */}
        {result.characteristics && (
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
            <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-2">
              Características
            </p>
            <p className="text-stone-700 text-sm leading-relaxed">
              {result.characteristics}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente Principal ───────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("upload");          // "upload" | "camera"
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  const webcamRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Enviar imagen al backend ──────────────────────────────────────────────
  const sendImage = useCallback(async (blob) => {
    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", blob, "capture.jpg");

    try {
      const res = await fetch(API_URL, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Subida de archivo ─────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    sendImage(file);
  };

  // ── Captura con cámara ────────────────────────────────────────────────────
  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setPreviewUrl(imageSrc);
    setCameraActive(false);

    // Convertimos data-URL a Blob
    fetch(imageSrc)
      .then((r) => r.blob())
      .then((blob) => sendImage(blob));
  }, [sendImage]);

  const reset = () => {
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setCameraActive(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50 font-sans">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="bg-green-900 text-white px-6 py-5 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <span className="text-3xl">🍄</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Clasificador de Setas</h1>
            <p className="text-green-300 text-xs">168 especies · Identificación por IA</p>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO ──────────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* ── SELECTOR DE MODO ─────────────────────────────────── */}
        <div className="flex rounded-xl bg-stone-200 p-1 w-fit mx-auto gap-1">
          {["upload", "camera"].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); reset(); }}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m
                  ? "bg-white text-green-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {m === "upload" ? "📁 Subir imagen" : "📷 Cámara"}
            </button>
          ))}
        </div>

        {/* ── ÁREA DE ENTRADA ──────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Panel izquierdo: input */}
          <div className="flex flex-col gap-4">

            {/* MODO UPLOAD */}
            {mode === "upload" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-300 hover:border-green-600 rounded-2xl p-8
                           flex flex-col items-center gap-3 cursor-pointer transition-colors bg-white
                           hover:bg-green-50 group"
              >
                <span className="text-5xl group-hover:scale-110 transition-transform">🍄</span>
                <p className="text-stone-600 font-medium text-sm text-center">
                  Haz clic o arrastra una imagen aquí
                </p>
                <p className="text-stone-400 text-xs">JPG, PNG, WEBP</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            )}

            {/* MODO CÁMARA */}
            {mode === "camera" && (
              <div className="flex flex-col gap-3">
                {cameraActive ? (
                  <>
                    <div className="rounded-2xl overflow-hidden border-2 border-green-600 shadow-md">
                      <Webcam
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        screenshotQuality={0.92}
                        videoConstraints={{ facingMode: "environment" }}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCapture}
                        className="flex-1 bg-green-700 hover:bg-green-800 text-white font-bold
                                   py-3 rounded-xl transition-colors shadow"
                      >
                        📸 Capturar
                      </button>
                      <button
                        onClick={() => setCameraActive(false)}
                        className="px-4 bg-stone-200 hover:bg-stone-300 text-stone-700
                                   rounded-xl transition-colors font-medium text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-white border-2 border-stone-200 rounded-2xl p-8
                                  flex flex-col items-center gap-4">
                    <span className="text-5xl">📷</span>
                    <p className="text-stone-500 text-sm text-center">
                      Activa la cámara y apunta a una seta
                    </p>
                    <button
                      onClick={() => { reset(); setCameraActive(true); }}
                      className="bg-green-700 hover:bg-green-800 text-white font-bold
                                 px-6 py-2.5 rounded-xl transition-colors shadow text-sm"
                    >
                      Activar cámara
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Preview de imagen enviada */}
            {previewUrl && (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Imagen analizada"
                  className="w-full rounded-2xl object-cover max-h-64 border border-stone-200 shadow-sm"
                />
                <button
                  onClick={reset}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-stone-500
                             hover:text-red-500 rounded-full w-8 h-8 flex items-center justify-center
                             shadow transition-colors text-lg leading-none"
                  title="Nueva imagen"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Panel derecho: resultado */}
          <div className="flex flex-col gap-3">
            {loading && <Spinner />}

            {error && !loading && (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-5">
                <p className="text-red-700 text-sm font-semibold mb-1">⚠️ Error de conexión</p>
                <p className="text-red-500 text-xs">{error}</p>
                <p className="text-red-400 text-xs mt-2">
                  Asegúrate de que el backend está corriendo en{" "}
                  <code className="bg-red-100 px-1 rounded">localhost:8000</code>
                </p>
              </div>
            )}

            {!loading && !error && !result && (
              <div className="rounded-2xl bg-white border border-stone-200 p-8 flex flex-col
                              items-center gap-3 text-center h-full justify-center">
                <span className="text-4xl opacity-30">🔬</span>
                <p className="text-stone-400 text-sm">
                  Los resultados aparecerán aquí una vez que analices una imagen.
                </p>
              </div>
            )}

            {!loading && result && <ResultCard result={result} />}
          </div>
        </div>

        {/* ── AVISO DE SEGURIDAD ──────────────────────────────── */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 flex gap-3 items-start">
          <span className="text-lg mt-0.5">⚠️</span>
          <p className="text-amber-800 text-xs leading-relaxed">
            <strong>Aviso importante:</strong> Este sistema es una herramienta de apoyo educativo.
            Nunca consumas una seta basándote únicamente en el resultado de esta IA. Consulta siempre
            a un micólogo experto antes de manipular o ingerir setas silvestres.
          </p>
        </div>

      </main>
    </div>
  );
}
