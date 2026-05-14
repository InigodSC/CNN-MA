"""
main.py - Backend FastAPI para clasificación de setas (PyTorch)
===============================================================
Endpoints:
  POST /predict   → recibe imagen, devuelve predicción + info del CSV

Archivos necesarios en el mismo directorio:
  mushroom_model.pth
  classes.json
  mushroom_info.csv
"""

import io
import json
import logging
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from torchvision import transforms

# ──────────────────────────────────────────────
# CONFIGURACIÓN
# ──────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent
MODEL_PATH  = BASE_DIR / "mushroom_model.pth"
CLASSES_PATH= BASE_DIR / "classes.json"
CSV_PATH    = BASE_DIR / "mushroom_info.csv"

CONFIDENCE_THRESHOLD = 0.40

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mushroom-api")

# ──────────────────────────────────────────────
# ARQUITECTURA CNN (debe coincidir con train.py)
# ──────────────────────────────────────────────
class ConvBlock(nn.Module):
    def __init__(self, in_ch, out_ch, dropout=0.0):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_ch, out_ch, 3, padding=1, bias=False),
            nn.BatchNorm2d(out_ch),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Dropout2d(dropout),
        )

    def forward(self, x):
        return self.block(x)


class MushroomCNN(nn.Module):
    def __init__(self, num_classes):
        super().__init__()
        self.features = nn.Sequential(
            ConvBlock(3,   32,  dropout=0.25),
            ConvBlock(32,  64,  dropout=0.30),
            ConvBlock(64,  128, dropout=0.35),
            ConvBlock(128, 256, dropout=0.40),
            ConvBlock(256, 512, dropout=0.45),
        )
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(512, 1024, bias=False),
            nn.BatchNorm1d(1024),
            nn.ReLU(inplace=True),
            nn.Dropout(0.50),
            nn.Linear(1024, 512, bias=False),
            nn.BatchNorm1d(512),
            nn.ReLU(inplace=True),
            nn.Dropout(0.50),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x

# ──────────────────────────────────────────────
# CARGA DE RECURSOS AL INICIO
# ──────────────────────────────────────────────
logger.info("Cargando modelo PyTorch...")
if not MODEL_PATH.exists():
    raise FileNotFoundError(f"No se encontró el modelo en {MODEL_PATH}")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
checkpoint = torch.load(MODEL_PATH, map_location=device)

num_classes  = checkpoint["num_classes"]
img_size     = checkpoint["img_size"]
class_names  = checkpoint["class_names"]

model = MushroomCNN(num_classes)
model.load_state_dict(checkpoint["model_state_dict"])
model.to(device)
model.eval()
logger.info(f"✅ Modelo cargado en {device} | {num_classes} clases | img {img_size}px")

# Transform de inferencia
inference_transform = transforms.Compose([
    transforms.Resize((img_size, img_size)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
])

logger.info("Cargando CSV de información...")
df_info = pd.read_csv(CSV_PATH, sep=",", encoding="utf-8")
df_info["_nombre_norm"] = df_info["Nombre"].str.strip().str.lower()
logger.info(f"✅ CSV cargado ({len(df_info)} filas)")

# ──────────────────────────────────────────────
# APLICACIÓN FASTAPI
# ──────────────────────────────────────────────
app = FastAPI(
    title="Mushroom Classifier API",
    description="Clasificación de setas con CNN PyTorch + información del CSV",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# UTILIDADES
# ──────────────────────────────────────────────
def preprocess_image(image_bytes: bytes) -> torch.Tensor:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = inference_transform(img).unsqueeze(0)   # (1, 3, H, W)
    return tensor.to(device)


def lookup_csv(species_name: str) -> dict:
    key = species_name.strip().lower()
    row = df_info[df_info["_nombre_norm"] == key]
    if row.empty:
        return {
            "comestible": "desconocido",
            "caracteristicas": "Información no disponible en la base de datos.",
        }
    row = row.iloc[0]
    return {
        "comestible":      str(row.get("comestible/no comestible", "desconocido")).strip().lower(),
        "caracteristicas": str(row.get("caracteristicas", "Sin descripción disponible.")).strip(),
    }

# ──────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────
@app.get("/", summary="Health check")
async def root():
    return {"status": "ok", "device": str(device), "num_classes": num_classes}


@app.post("/predict", summary="Predice la especie de seta en una imagen")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=422,
            detail=f"El archivo debe ser una imagen. Recibido: {file.content_type}",
        )

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=422, detail="El archivo está vacío.")

    try:
        tensor = preprocess_image(image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"No se pudo procesar la imagen: {exc}")

    with torch.no_grad():
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            logits      = model(tensor)
            probs       = torch.softmax(logits, dim=1)[0]
            top_conf, top_idx = probs.max(0)

    confidence   = float(top_conf.cpu())
    top_index    = int(top_idx.cpu())

    if confidence < CONFIDENCE_THRESHOLD:
        return JSONResponse(content={
            "identified":  False,
            "message":     "No se pudo identificar la seta con suficiente certeza.",
            "confidence":  round(confidence * 100, 2),
            "threshold":   round(CONFIDENCE_THRESHOLD * 100, 2),
            "species":     None,
            "edible":      None,
            "characteristics": None,
        })

    species_name = class_names[top_index]
    csv_data     = lookup_csv(species_name)

    return JSONResponse(content={
        "identified":      True,
        "species":         species_name,
        "confidence":      round(confidence * 100, 2),
        "edible":          csv_data["comestible"],
        "characteristics": csv_data["caracteristicas"],
        "threshold":       round(CONFIDENCE_THRESHOLD * 100, 2),
    })

# ──────────────────────────────────────────────
# EJECUCIÓN LOCAL
# ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
