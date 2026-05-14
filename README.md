# 🍄 Clasificador de Setas — CNN + FastAPI + React

Sistema completo de reconocimiento de setas con red neuronal convolucional propia,
API REST y frontend con cámara en tiempo real.

---

## Estructura del proyecto

```
proyecto/
├── training/
│   └── train.py               ← Entrena la CNN y genera los artefactos
├── backend/
│   ├── main.py                ← API FastAPI
│   ├── mushroom_model.keras   ← (generado por train.py)
│   ├── classes.json           ← (generado por train.py)
│   └── mushroom_info.csv      ← Tu CSV con info de especies
├── frontend/
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── index.js
│       ├── index.css
│       └── App.js
└── images/                    ← Dataset (168 subcarpetas)
    ├── Agaricus bisporus/
    ├── Amanita muscaria/
    └── ...
```

---

## 1. Entrenamiento

### Requisitos previos (Windows + NVIDIA)
1. Instala **CUDA Toolkit 12.x** desde https://developer.nvidia.com/cuda-downloads
2. Instala **cuDNN** desde https://developer.nvidia.com/cudnn
3. Crea un entorno virtual:

```bash
python -m venv venv
venv\Scripts\activate
pip install tensorflow[and-cuda]==2.17.* numpy pillow
```

### Organización del dataset
```
images/
  Nombre Especie 1/   ← debe coincidir EXACTAMENTE con columna "Nombre" del CSV
    img001.jpg
    img002.jpg
  Nombre Especie 2/
    ...
```

### Ejecutar entrenamiento
```bash
cd training
python train.py
```

Genera en la carpeta `training/`:
- `mushroom_model.keras` — mejor modelo (por val_accuracy)
- `classes.json` — mapeo índice → nombre de especie

**Parámetros ajustables** en `train.py`:
| Variable | Valor por defecto | Descripción |
|---|---|---|
| `BATCH_SIZE` | 64 | Reduce si hay OOM en GPU |
| `EPOCHS` | 60 | EarlyStopping actúa antes si converge |
| `VAL_SPLIT` | 0.15 | 15% para validación |
| `CONFIDENCE_THRESHOLD` | 0.40 | Umbral mínimo de confianza |

Monitoriza el entrenamiento con TensorBoard:
```bash
tensorboard --logdir training/logs
```

---

## 2. Backend (FastAPI)

### Setup
```bash
cd backend

# Copia aquí los artefactos del entrenamiento:
copy ..\training\mushroom_model.keras .
copy ..\training\classes.json .
# (mushroom_info.csv ya debe estar aquí)

pip install fastapi uvicorn[standard] python-multipart tensorflow[and-cuda] pandas pillow
```

### Arrancar el servidor
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Documentación interactiva disponible en: http://localhost:8000/docs

### Endpoint principal

**POST** `/predict`
- Body: `multipart/form-data` con campo `file` (imagen JPG/PNG/WEBP)
- Respuesta si identificada:
```json
{
  "identified": true,
  "species": "Amanita muscaria",
  "confidence": 87.43,
  "edible": "no comestible",
  "characteristics": "Sombrero rojo con manchas blancas...",
  "threshold": 40.0
}
```
- Respuesta si confianza < 40%:
```json
{
  "identified": false,
  "message": "No se pudo identificar la seta con suficiente certeza.",
  "confidence": 23.11,
  "threshold": 40.0
}
```

---

## 3. Frontend (React)

### Setup
```bash
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p   # genera postcss.config.js automáticamente
npm start                 # abre en http://localhost:3000
```

### Funcionalidades
- **Subir imagen**: arrastra o selecciona desde el explorador
- **Cámara en tiempo real**: usa `react-webcam`, compatible con móvil (cámara trasera)
- **Resultados**:
  - Nombre de la especie + barra de confianza
  - Badge verde (comestible) / rojo (no comestible) / ámbar (desconocido)
  - Características del CSV
  - Mensaje claro si no supera el umbral del 40%

---

## Notas importantes

### Columna del CSV
El backend busca en el CSV de forma robusta (`.strip().lower()`).
Asegúrate de que los nombres de las **carpetas del dataset** y la columna **`Nombre`** del CSV
sean equivalentes (pueden diferir en mayúsculas/minúsculas o espacios laterales, pero no en caracteres).

### Rendimiento esperado
Con 100k imágenes y 168 clases desde cero, es normal obtener:
- **Top-1 accuracy**: 55–75% (depende de calidad y balance del dataset)
- **Top-3 accuracy**: 75–90%

Si el accuracy es bajo, considera: más épocas, más data augmentation, o revisar el balanceo de clases.

### ⚠️ Aviso de seguridad
Este sistema es una herramienta educativa/de apoyo.
**Nunca** consumas una seta basándote únicamente en el resultado de esta IA.
Consulta siempre a un micólogo experto.
