import React from 'react';
import { 
  Layers, 
  Smartphone, 
  Cpu, 
  Database, 
  Cloud, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  GitBranch, 
  FileCheck, 
  ShieldCheck, 
  Camera, 
  Mic, 
  FolderGit2,
  WifiOff,
  RefreshCw,
  HardDrive
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/20 rounded-3xl p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Layers className="w-3.5 h-3.5" />
              Arquitectura Offline-First & Resiliencia
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Clean Architecture + Caché SQLite Offline & Auto-Sync
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Diseño desacoplado, modular y reactivo para una aplicación móvil con sincronización de hardware (cámara frontal + reconocimiento de voz simultáneo), almacenamiento temporal local en SQLite (<code className="text-amber-300 font-mono">sqflite</code>) ante pérdidas de conectividad, y auto-sincronización en segundo plano con Google Drive y Cloud Firestore.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stack Tecnológico</span>
            <div className="flex flex-wrap gap-1.5 max-w-xs">
              {['Flutter 3.24', 'Dart 3.5', 'Riverpod 2.5', 'sqflite 2.3', 'connectivity_plus', 'Google Drive v3', 'Firestore'].map((tag) => (
                <span key={tag} className="text-[11px] bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-mono">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Layered Architecture Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Layer 1: Presentation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
            <Smartphone className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Capa 1: Presentación</span>
          <h3 className="text-base font-bold text-white mt-1">Widgets & UI</h3>
          <p className="text-xs text-slate-400 mt-2 mb-4">
            Componentes visuales, split-screen y estados de conectividad.
          </p>
          <ul className="space-y-2 text-xs text-slate-300 flex-1">
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>RecordingScreen (Split-view)</span>
            </li>
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <FileCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>NotebookPaperWidget (Painter)</span>
            </li>
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Badge Offline / Sincronizando</span>
            </li>
          </ul>
        </div>

        {/* Layer 2: State Management & Controllers */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Cpu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Capa 2: Controladores</span>
          <h3 className="text-base font-bold text-white mt-1">StateNotifier & Sync</h3>
          <p className="text-xs text-slate-400 mt-2 mb-4">
            Orquestación sincronizada de hardware y enrutamiento online/offline.
          </p>
          <ul className="space-y-2 text-xs text-slate-300 flex-1">
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>DiaryController (Fallback offline)</span>
            </li>
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>SyncCoordinator (connectivity listener)</span>
            </li>
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              <span>SpeechToText Listening Loop</span>
            </li>
          </ul>
        </div>

        {/* Layer 3: Local Offline Cache & Domain */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
            <Database className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Capa 3: Caché SQLite</span>
          <h3 className="text-base font-bold text-white mt-1">sqflite & Dominio</h3>
          <p className="text-xs text-slate-400 mt-2 mb-4">
            Persistencia local inmediata ante pérdida de cobertura.
          </p>
          <ul className="space-y-2 text-xs text-slate-300 flex-1">
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>OfflineCacheService (SQLite Queue)</span>
            </li>
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>DiaryEntry (shared_with único)</span>
            </li>
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>SyncStatus (pending, syncing, synced)</span>
            </li>
          </ul>
        </div>

        {/* Layer 4: Cloud Infrastructure & Services */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
            <Cloud className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Capa 4: Servicios Nube</span>
          <h3 className="text-base font-bold text-white mt-1">Drive & Firestore</h3>
          <p className="text-xs text-slate-400 mt-2 mb-4">
            Destino final tras sincronización autenticada.
          </p>
          <ul className="space-y-2 text-xs text-slate-300 flex-1">
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              <span>GoogleDriveService (scope drive.file)</span>
            </li>
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <Cloud className="w-3.5 h-3.5 text-purple-400" />
              <span>FirestoreService (Colección diary_entries)</span>
            </li>
            <li className="flex items-center gap-2 p-1.5 rounded bg-slate-950/60 border border-slate-800/80">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>firestore.rules (Bloqueo 1:1)</span>
            </li>
          </ul>
        </div>

      </div>

      {/* Offline Caching & Auto-Sync Workflow Diagram */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">
            Flujo Arquitectónico de Almacenamiento Temporal y Auto-Sincronización
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Cómo interactúan el grabador, la base SQLite local y el coordinador de red ante caídas de internet:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-amber-400 font-bold">1. DETECCIÓN & FALLBACK</span>
              <h4 className="text-sm font-bold text-white mt-1">Grabación Sin Cobertura</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                El usuario finaliza su entrada mientras está en modo avión o sin señal. <code className="text-amber-300">DiaryController</code> detecta <code className="text-amber-300">ConnectivityResult.none</code> o fallo de socket.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-amber-300/90 font-mono">
              → No bloquea al usuario
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">2. ALMACENAMIENTO LOCAL</span>
              <h4 className="text-sm font-bold text-white mt-1">Caché SQLite (sqflite)</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Se persiste la entrada en la tabla <code className="text-amber-300">offline_diary_queue</code> con la transcripción, metadatos, ruta del video local (<code className="text-amber-300">local_video_path</code>) y estado <code className="text-amber-300">SyncStatus.pending</code>.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400/90 font-mono">
              → Datos seguros en disco
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-blue-400 font-bold">3. EVENTO REACTIVO</span>
              <h4 className="text-sm font-bold text-white mt-1">Recuperación de Red</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                <code className="text-amber-300">SyncCoordinator</code> escucha el stream <code className="text-amber-300">onConnectivityChanged</code> de <code className="text-amber-300">connectivity_plus</code>. Al detectar Wi-Fi o red móvil, inicia el procesamiento secuencial FIFO.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-blue-400/90 font-mono">
              → Disparo automático background
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-purple-400 font-bold">4. DRAIN & COMMIT</span>
              <h4 className="text-sm font-bold text-white mt-1">Subida a Drive y Firestore</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                1) Sube el video pendiente a Google Drive por streaming.
                <br />2) Registra el documento en Cloud Firestore con la regla 1:1.
                <br />3) Actualiza el estado local a <code className="text-amber-300">SyncStatus.synced</code>.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-purple-400/90 font-mono">
              → Sincronizado en la nube
            </div>
          </div>
        </div>
      </div>

      {/* Directory Structure Tree */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-amber-400" />
          Estructura de Servicios y Caché Offline en Flutter
        </h3>
        <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-amber-300/90 font-mono overflow-x-auto leading-relaxed">
{`lib/
├── presentation/
│   ├── controllers/
│   │   └── diary_controller.dart          # Coordina cámara, STT y delega a caché si no hay red
│   └── views/
│       └── recording_screen.dart          # Muestra badges offline y cantidad de pendientes
├── data/
│   ├── services/
│   │   ├── offline_cache_service.dart     # SQLite (sqflite): tabla offline_diary_queue
│   │   ├── sync_coordinator.dart          # Worker reactivo a connectivity_plus (Auto-Sync)
│   │   ├── google_drive_service.dart      # Subida a Drive v3 por chunks
│   │   └── firestore_service.dart         # Persistencia en Cloud Firestore (regla 1:1)
│   └── models/
│       └── diary_entry_model.dart         # Entidad con validación estricta de compartición
pubspec.yaml                               # Incluye sqflite: ^2.3.3+1 y connectivity_plus: ^6.0.5`}
        </pre>
      </div>
    </div>
  );
};
