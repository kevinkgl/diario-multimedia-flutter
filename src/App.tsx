import React, { useState } from 'react';
import { 
  Smartphone, 
  Code2, 
  Layers, 
  Lock, 
  FolderDown, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Camera, 
  Mic, 
  HardDrive,
  Github,
  Check
} from 'lucide-react';
import { PhoneSimulator } from './components/PhoneSimulator';
import { CodeViewer } from './components/CodeViewer';
import { ArchitectureView } from './components/ArchitectureView';
import { StrictSharingExplainer } from './components/StrictSharingExplainer';
import { GitHubGuideModal } from './components/GitHubGuideModal';
import { FLUTTER_CODE_FILES } from './data/flutterCodeSnippets';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'architecture' | 'security' | 'export' | 'github'>('simulator');
  const [allCopied, setAllCopied] = useState<boolean>(false);

  const handleDownloadAll = () => {
    // Generate a full project bundle text file
    let bundle = `# DIARIO PERSONAL MULTIMEDIA E INTELIGENTE - FLUTTER PROJECT EXPORT\n`;
    bundle += `# Generado para producción en Android e iOS con Flutter 3.24+ y Riverpod\n\n`;

    FLUTTER_CODE_FILES.forEach((file) => {
      bundle += `\n${'='.repeat(70)}\n`;
      bundle += `FILE: ${file.path} (${file.filename})\n`;
      bundle += `DESCRIPTION: ${file.description}\n`;
      bundle += `${'='.repeat(70)}\n\n`;
      bundle += file.code + '\n';
    });

    const blob = new Blob([bundle], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flutter_multimedia_diary_project_bundle.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAllCode = () => {
    let bundle = ``;
    FLUTTER_CODE_FILES.forEach((file) => {
      bundle += `// ===================== ${file.path} =====================\n\n`;
      bundle += file.code + '\n\n';
    });
    navigator.clipboard.writeText(bundle);
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans-ui selection:bg-amber-500/20 selection:text-amber-200">
      
      {/* Top Global App Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <BookOpen className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  Diario Personal Multimedia
                </h1>
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  Flutter Architecture Studio
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cámara Frontal + Speech-To-Text en Vivo + Google Drive v3 + Firestore 1:1
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'simulator'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Simulador en Vivo</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'code'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Código Dart</span>
            </button>

            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'architecture'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Arquitectura</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'security'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Regla 1:1</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'export'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </button>

            <button
              onClick={() => setActiveTab('github')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'github'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'text-amber-400 hover:text-white hover:bg-slate-900 border border-amber-500/30 bg-amber-500/10'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>Subir a GitHub</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Highlights Bar */}
      <div className="bg-slate-900/40 border-b border-slate-800/60 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              Cámara Frontal HD
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Mic className="w-3.5 h-3.5 text-amber-400" />
              Speech-To-Text en Vivo
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              Google Drive v3
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              Regla 1:1
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Caché SQLite Offline & Auto-Sync
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAllCode}
              className="text-[11px] text-slate-300 hover:text-amber-300 transition flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg"
            >
              {allCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Code2 className="w-3 h-3" />}
              {allCopied ? '¡Todo el código copiado!' : 'Copiar todo el código'}
            </button>
          </div>
        </div>
      </div>

      {/* Main App Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'simulator' && <PhoneSimulator />}
        {activeTab === 'code' && <CodeViewer />}
        {activeTab === 'architecture' && <ArchitectureView />}
        {activeTab === 'security' && <StrictSharingExplainer />}
        {activeTab === 'export' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FolderDown className="w-5 h-5 text-amber-400" />
                  Paquete de Exportación para Flutter
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Incluye todos los archivos listos para copiar en Android Studio o VS Code:
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyAllCode}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-700 transition"
                >
                  {allCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Code2 className="w-4 h-4" />}
                  {allCopied ? 'Copiado al portapapeles' : 'Copiar Todo el Bundle'}
                </button>
                <button
                  onClick={handleDownloadAll}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  <FolderDown className="w-4 h-4" />
                  Descargar Paquete Completo (.txt)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FLUTTER_CODE_FILES.map((file) => (
                <div key={file.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-amber-400">{file.filename}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-mono">
                        {file.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono block mb-2">{file.path}</span>
                    <p className="text-xs text-slate-300 leading-relaxed">{file.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-mono text-[10px]">
                      {file.code.split('\n').length} líneas
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(file.code);
                        alert(`¡${file.filename} copiado al portapapeles!`);
                      }}
                      className="text-amber-400 hover:text-amber-300 font-semibold text-xs flex items-center gap-1"
                    >
                      Copiar archivo individual
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'github' && <GitHubGuideModal />}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Arquitectura de Software y Código de Producción en Flutter para Diario Personal Multimedia.
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Flutter 3.24+</span>
            <span>•</span>
            <span>Riverpod 2.5</span>
            <span>•</span>
            <span>Google Drive API v3</span>
            <span>•</span>
            <span>Cloud Firestore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
