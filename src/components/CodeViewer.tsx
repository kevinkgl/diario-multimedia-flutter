import React, { useState } from 'react';
import { FLUTTER_CODE_FILES, CodeFile } from '../data/flutterCodeSnippets';
import { 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  FolderTree, 
  Layers, 
  Code2, 
  Search,
  ExternalLink,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<string>(FLUTTER_CODE_FILES[0].id);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const selectedFile = FLUTTER_CODE_FILES.find(f => f.id === selectedFileId) || FLUTTER_CODE_FILES[0];

  const filteredFiles = FLUTTER_CODE_FILES.filter(file => {
    const matchesSearch = file.filename.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          file.path.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          file.description.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([selectedFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories = [
    { id: 'all', label: 'Todos los Archivos' },
    { id: 'controller', label: '🎮 Controlador' },
    { id: 'service', label: '☁️ Servicios (Drive/DB)' },
    { id: 'ui', label: '🎨 UI & Cuaderno' },
    { id: 'model', label: '📐 Modelos 1:1' },
    { id: 'rules', label: '🛡️ Reglas de Seguridad' },
    { id: 'config', label: '⚙️ Configuración' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[820px]">
      
      {/* Top Header / Bar */}
      <div className="p-4 px-6 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Código Fuente Flutter de Producción
                <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                  Dart 3.5+ / Riverpod 2.x
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Código estructurado y modular listo para copiar e incorporar en tu proyecto Flutter.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700/60 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Archivo</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar {selectedFile.filename}</span>
          </button>
        </div>
      </div>

      {/* Categories Pill Filter */}
      <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
              selectedCategory === cat.id
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Split Body: File Tree (Left) & Code Editor (Right) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar: File Explorer */}
        <div className="w-72 border-r border-slate-800 bg-slate-950/40 flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b border-slate-800/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar archivos..."
                className="w-full bg-slate-900 text-slate-200 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-3 h-3" />
              <span>Entregables Requeridos</span>
            </div>

            {filteredFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition flex flex-col gap-0.5 ${
                  selectedFileId === file.id
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-mono text-[11px] font-semibold">
                  <FileCode className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="truncate">{file.filename}</span>
                </div>
                <span className="text-[10px] text-slate-500 truncate pl-5">
                  {file.path}
                </span>
              </button>
            ))}

            {filteredFiles.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                No se encontraron archivos coincidentes.
              </div>
            )}
          </div>

          {/* Architecture Badge */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/40 text-[11px] text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Clean Architecture con separación por capas y testing unitario.</span>
          </div>
        </div>

        {/* Right Area: Code Display */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          
          {/* File Tab Info Bar */}
          <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-amber-400 font-semibold">
                {selectedFile.path}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                {selectedFile.code.split('\n').length} líneas
              </span>
            </div>
            <p className="text-xs text-slate-400 italic truncate max-w-md">
              {selectedFile.description}
            </p>
          </div>

          {/* Code Viewer Container */}
          <div className="flex-1 overflow-auto p-4 font-mono-code text-xs text-slate-300 bg-slate-950 leading-relaxed selection:bg-amber-500/20">
            <pre className="tab-4">
              <code>
                {selectedFile.code.split('\n').map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-slate-900/50 transition">
                    <span className="table-cell select-none pr-6 text-right text-slate-600 text-[11px] font-mono">
                      {idx + 1}
                    </span>
                    <span className="table-cell whitespace-pre text-slate-200">
                      {/* Simple high-readability syntax highlighting for keywords */}
                      {highlightSyntax(line)}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          </div>

          {/* Architectural Notes Footer Bar */}
          <div className="p-3 px-6 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-medium">Nota de Arquitectura:</span>
              <span className="text-slate-400">{getArchitecturalNote(selectedFile.id)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Lightweight syntax tokenizer for Dart / Rules
function highlightSyntax(line: string): React.ReactNode {
  if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
    return <span className="text-emerald-400/80 italic">{line}</span>;
  }
  if (line.trim().startsWith('///')) {
    return <span className="text-teal-400 italic">{line}</span>;
  }
  if (line.includes('class ') || line.includes('enum ') || line.includes('extends ')) {
    return <span className="text-amber-300 font-semibold">{line}</span>;
  }
  if (line.includes('Future<') || line.includes('Stream<') || line.includes('void ') || line.includes('final ')) {
    return <span className="text-sky-300">{line}</span>;
  }
  return line;
}

function getArchitecturalNote(fileId: string): string {
  switch (fileId) {
    case 'diary_controller':
      return 'StateNotifier garantiza inmutabilidad, evitando fugas de memoria con dispose() sincronizado de cámara y audio.';
    case 'google_drive_service':
      return 'Utiliza el scope mínimo requerido "drive.file", garantizando que la app no pueda ver otros archivos personales del usuario.';
    case 'recording_screen':
      return 'Split-screen con CustomPainter que dibuja la hoja de cuaderno pautada y anima las palabras con tinta fluida.';
    case 'diary_entry_model':
      return 'Validador estricto que prohíbe comas o arrays en shared_with, blindando la regla de privacidad 1:1 en el dominio.';
    case 'firestore_rules':
      return 'Garantiza en el backend que nadie más que el creador o el único email especificado pueda leer el documento.';
    default:
      return 'Código modular desacoplado según principios SOLID y Clean Architecture.';
  }
}
