#!/usr/bin/env bash
# ==============================================================================
# Script para subir este proyecto a GitHub
# ==============================================================================

echo "=========================================================="
echo " Subir Diario Multimedia Flutter a tu cuenta de GitHub"
echo "=========================================================="

# Solicitar usuario y nombre del repo si no se pasaron como argumentos
if [ -z "$1" ]; then
    read -p "Ingresa tu usuario de GitHub: " GITHUB_USER
else
    GITHUB_USER=$1
fi

if [ -z "$2" ]; then
    read -p "Ingresa el nombre del repositorio (ej: diario-multimedia-flutter): " REPO_NAME
else
    REPO_NAME=$2
fi

REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo ""
echo "Conectando con: $REPO_URL"
echo ""

# 1. Inicializar git si no existe
if [ ! -d ".git" ]; then
    echo "1. Inicializando repositorio Git local..."
    git init
else
    echo "1. Repositorio Git local ya existe."
fi

# 2. Agregar todos los archivos
echo "2. Agregando archivos al seguimiento..."
git add .

# 3. Commit
echo "3. Creando commit inicial..."
git commit -m "feat: Diario Personal Multimedia en Flutter con Cámara, STT, Drive, SQLite y Firestore" || true

# 4. Rama main
echo "4. Estableciendo rama main..."
git branch -M main

# 5. Configurar remoto
echo "5. Configurando remote origin..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

# 6. Push
echo "6. Subiendo a GitHub..."
echo "Nota: Si te pide contraseña, utiliza un Personal Access Token (PAT) de GitHub."
git push -u origin main

echo ""
echo "=========================================================="
echo " ¡Listo! Tu proyecto ha sido publicado en: $REPO_URL"
echo "=========================================================="
