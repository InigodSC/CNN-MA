"""
train.py - Entrenamiento CNN para clasificación de setas (PyTorch)
==================================================================
Dataset:    /images/  (168 subcarpetas, una por especie)
Salida:     mushroom_model.pth + classes.json
Hardware:   Windows + NVIDIA RTX 3060 Ti (CUDA 12)
"""

import os
import json
import time
import copy
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms
from PIL import Image

# ──────────────────────────────────────────────
# 0. CONFIGURACIÓN
# ──────────────────────────────────────────────
DATASET_DIR  = r"C:\CNN-MA\images"   # ajusta si es necesario
IMG_SIZE     = 224
BATCH_SIZE   = 32                     # reduce a 32 si hay OOM
EPOCHS       = 100
VAL_SPLIT    = 0.15
NUM_CLASSES  = 168
LR           = 3e-4
MODEL_OUT    = "mushroom_model.pth"
CLASSES_OUT  = "classes.json"
PATIENCE     = 25                     # EarlyStopping

# ──────────────────────────────────────────────
# CLASES (fuera del guard — necesarias para pickle en workers)
# ──────────────────────────────────────────────
class TransformSubset(torch.utils.data.Dataset):
    """Aplica transforms diferentes a un Subset sin recargar el dataset."""
    def __init__(self, subset, transform):
        self.subset    = subset
        self.transform = transform

    def __len__(self):
        return len(self.subset)

    def __getitem__(self, idx):
        original_idx   = self.subset.indices[idx]
        path, label    = self.subset.dataset.samples[original_idx]
        img            = Image.open(path).convert("RGB")
        return self.transform(img), label


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
            ConvBlock(3,   32,  dropout=0.25),   # 128→64
            ConvBlock(32,  64,  dropout=0.30),   # 64→32
            ConvBlock(64,  128, dropout=0.35),   # 32→16
            ConvBlock(128, 256, dropout=0.40),   # 16→8
            ConvBlock(256, 512, dropout=0.45),   # 8→4
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
# FUNCIONES TRAIN / EVAL (fuera del guard — necesarias para pickle)
# ──────────────────────────────────────────────
def train_epoch(model, loader, optimizer, criterion, scaler, device):
    model.train()
    running_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs   = imgs.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        optimizer.zero_grad()
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            outputs = model(imgs)
            loss    = criterion(outputs, labels)
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
        running_loss += loss.item() * imgs.size(0)
        correct      += outputs.argmax(1).eq(labels).sum().item()
        total        += imgs.size(0)
    return running_loss / total, correct / total


@torch.no_grad()
def eval_epoch(model, loader, criterion, device):
    model.eval()
    running_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs   = imgs.to(device, non_blocking=True)
        labels = labels.to(device, non_blocking=True)
        with torch.amp.autocast("cuda", enabled=(device.type == "cuda")):
            outputs = model(imgs)
            loss    = criterion(outputs, labels)
        running_loss += loss.item() * imgs.size(0)
        correct      += outputs.argmax(1).eq(labels).sum().item()
        total        += imgs.size(0)
    return running_loss / total, correct / total


# ──────────────────────────────────────────────
# PUNTO DE ENTRADA — obligatorio en Windows con num_workers > 0
# ──────────────────────────────────────────────
if __name__ == '__main__':

    # ── 1. DEVICE ──────────────────────────────
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"✅ Usando: {device}")
    if device.type == "cuda":
        print(f"   GPU: {torch.cuda.get_device_name(0)}")
        print(f"   VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")

    # ── 2. TRANSFORMS ──────────────────────────
    train_transforms = transforms.Compose([
    transforms.Resize(256),              # escala el lado corto a 256, mantiene aspect ratio
    transforms.RandomCrop(224),          # recorte aleatorio 224x224 → augmentation gratis
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(),
    transforms.RandomRotation(45),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.1),
    transforms.RandomGrayscale(p=0.05),
    transforms.RandomPerspective(distortion_scale=0.3, p=0.4),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225]),
    ])

    val_transforms = transforms.Compose([
        transforms.Resize(256),              # mismo escalado
        transforms.CenterCrop(224),          # recorte central fijo para validación (reproducible)
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                            std=[0.229, 0.224, 0.225]),
    ])

    # ── 3. DATASET ─────────────────────────────
    print("\n📂 Cargando dataset...")
    full_dataset = datasets.ImageFolder(root=DATASET_DIR, transform=train_transforms)

    class_names = full_dataset.classes
    with open(CLASSES_OUT, "w", encoding="utf-8") as f:
        json.dump(class_names, f, ensure_ascii=False, indent=2)
    print(f"✅ {len(class_names)} clases encontradas → classes.json guardado")

    n_total = len(full_dataset)
    n_val   = int(n_total * VAL_SPLIT)
    n_train = n_total - n_val
    train_subset, val_subset = random_split(
        full_dataset, [n_train, n_val],
        generator=torch.Generator().manual_seed(42)
    )

    train_dataset = TransformSubset(train_subset, train_transforms)
    val_dataset   = TransformSubset(val_subset,   val_transforms)

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=4,
        pin_memory=(device.type == "cuda"),
        persistent_workers=True,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=4,
        pin_memory=(device.type == "cuda"),
        persistent_workers=True,
    )

    print(f"   Train: {n_train} imágenes | Val: {n_val} imágenes")

    # ── 4. MODELO ──────────────────────────────
    model = MushroomCNN(NUM_CLASSES).to(device)
    total_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"\n🧠 Modelo creado — parámetros entrenables: {total_params:,}")

    # ── 5. LOSS, OPTIMIZER, SCHEDULER ──────────
    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.Adam(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingWarmRestarts(
        optimizer, T_0=10, T_mult=2, eta_min=1e-6
    )
    # FutureWarning corregido: usar torch.amp en lugar de torch.cuda.amp
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    # ── 6. ENTRENAMIENTO ───────────────────────
    print("\n🚀 Iniciando entrenamiento...\n")

    best_val_acc   = 0.0
    best_weights   = None
    patience_count = 0

    for epoch in range(1, EPOCHS + 1):
        t0 = time.time()
        train_loss, train_acc = train_epoch(model, train_loader, optimizer, criterion, scaler, device)
        val_loss,   val_acc   = eval_epoch(model, val_loader, criterion, device)
        scheduler.step()
        elapsed = time.time() - t0

        print(
            f"Época {epoch:3d}/{EPOCHS} | "
            f"Train loss: {train_loss:.4f} acc: {train_acc*100:.2f}% | "
            f"Val loss: {val_loss:.4f} acc: {val_acc*100:.2f}% | "
            f"LR: {scheduler.get_last_lr()[0]:.2e} | "
            f"{elapsed:.0f}s"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_weights = copy.deepcopy(model.state_dict())
            torch.save({
                "epoch":            epoch,
                "model_state_dict": best_weights,
                "val_acc":          best_val_acc,
                "num_classes":      NUM_CLASSES,
                "img_size":         IMG_SIZE,
                "class_names":      class_names,
            }, MODEL_OUT)
            print(f"  ✅ Mejor modelo guardado (val_acc: {best_val_acc*100:.2f}%)")
            patience_count = 0
        else:
            patience_count += 1
            if patience_count >= PATIENCE:
                print(f"\n⏹  EarlyStopping en época {epoch} (sin mejora en {PATIENCE} épocas)")
                break

    print(f"\n✅ Entrenamiento completado.")
    print(f"   Mejor val_accuracy : {best_val_acc*100:.2f}%")
    print(f"   Modelo guardado    : {MODEL_OUT}")
    print(f"   Clases guardadas   : {CLASSES_OUT}")
