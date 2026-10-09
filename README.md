# Diario Personal Multimedia e Inteligente (Flutter & Dart)

Aplicación móvil para Android e iOS de Diario Multimedia con grabación de video con cámara frontal, transcripción de voz en tiempo real (`speech_to_text`) sobre un diseño de hoja de cuaderno pautada, almacenamiento en **Google Drive** con el scope `drive.file`, regla de privacidad estricta 1:1 en **Cloud Firestore**, y soporte de caché local offline en **SQLite** (`sqflite`) con auto-sincronización reactiva (`connectivity_plus`).

---

## 🚀 Cómo Subir este Proyecto a tu GitHub

Sigue estos sencillos pasos desde tu terminal (PowerShell, Git Bash, Mac o Linux):

### Paso 1: Crea un repositorio vacío en GitHub
1. Entra a [github.com](https://github.com) e inicia sesión con tu cuenta.
2. Haz clic en el botón verde **"New"** (o en **"Nuevo repositorio"**).
3. Asigna un nombre al repositorio, por ejemplo: `diario-personal-multimedia-flutter`.
4. Selecciona **Public** o **Private**.
5. **IMPORTANTE:** Deja desmarcadas las opciones de *"Add a README file"*, *"Add .gitignore"* y *"Choose a license"* (ya las tenemos incluidas aquí).
6. Haz clic en **"Create repository"**.
7. Copia la URL de tu nuevo repositorio (ejemplo: `https://github.com/TU_USUARIO/diario-personal-multimedia-flutter.git`).

---

### Paso 2: Inicializa Git y sube tus archivos
Abre tu terminal en la carpeta de este proyecto y ejecuta los siguientes comandos:

```bash
# 1. Inicializar el repositorio Git local
git init

# 2. Agregar todos los archivos al seguimiento
git add .

# 3. Crear el primer commit
git commit -m "feat: Diario Personal Multimedia en Flutter con Cámara, STT, Drive, SQLite y Firestore"

# 4. Asegurar que la rama principal se llame main
git branch -M main

# 5. Conectar con tu repositorio de GitHub (reemplaza TU_USUARIO y TU_REPO)
git remote add origin https://github.com/TU_USUARIO/diario-personal-multimedia-flutter.git

# 6. Subir el proyecto a GitHub
git push -u origin main
```

> **Nota sobre autenticación en GitHub:**  
> Cuando Git te pida contraseña en la terminal, GitHub requiere un **Personal Access Token (Classic)** en lugar de tu contraseña habitual.  
> Puedes generarlo en: `GitHub -> Settings -> Developer Settings -> Personal access tokens -> Tokens (classic)` con permisos de `repo`.

---

## 📁 Estructura del Proyecto Flutter

```text
flutter_project/
├── pubspec.yaml                             # Dependencias (Riverpod, camera, sqflite, etc.)
├── firestore.rules                          # Reglas de seguridad en Firestore (Regla 1:1)
└── lib/
    ├── main.dart                            # ProviderScope y punto de entrada
    ├── presentation/
    │   ├── controllers/
    │   │   └── diary_controller.dart        # StateNotifier sincronizado y fallback offline
    │   ├── views/
    │   │   └── recording_screen.dart        # Split-screen (CameraPreview + Hoja de cuaderno)
    │   └── widgets/
    │       ├── notebook_paper_widget.dart   # CustomPainter con renglones azules y margen rojo
    │       └── share_single_person_dialog.dart # Modal para compartir con máximo 1 persona
    └── data/
        ├── models/
        │   └── diary_entry_model.dart       # Entidad con validación estricta 1:1
        └── services/
            ├── offline_cache_service.dart   # Base SQLite (sqflite) para modo sin conexión
            ├── sync_coordinator.dart        # Sincronización automática con connectivity_plus
            ├── google_drive_service.dart    # Subida de videos a Google Drive v3
            └── firestore_service.dart       # Consultas Firestore (dueño y destinatario)
```

---

## ⚙️ Requisitos y Configuración de APIs

### 1. Google Drive API
1. En **Google Cloud Console**, habilita **Google Drive API**.
2. En la pantalla de consentimiento OAuth, agrega el scope `https://www.googleapis.com/auth/drive.file`.
3. Registra tu SHA-1 de Android y Bundle ID de iOS en las credenciales OAuth 2.0.

### 2. Cloud Firestore
1. En Firebase Console, crea una base de datos Firestore en modo producción.
2. Despliega las reglas proporcionadas en `firestore.rules`.
3. Esto garantiza que nadie más que el creador o el único email en `shared_with` pueda leer las entradas.

---

## 🛠️ Ejecución Local con Flutter

```bash
# 1. Ingresar a la carpeta de Flutter
cd flutter_project

# 2. Obtener dependencias
flutter pub get

# 3. Ejecutar en tu emulador o dispositivo físico
flutter run
```
