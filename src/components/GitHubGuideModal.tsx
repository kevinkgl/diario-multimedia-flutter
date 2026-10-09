import React, { useState } from 'react';
import { 
  Github, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink, 
  Key, 
  FolderGit2, 
  ShieldCheck, 
  Download,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface GitHubGuideModalProps {
  onClose?: () => void;
}

export const GitHubGuideModal: React.FC<GitHubGuideModalProps> = ({ onClose }) => {
  const [githubUsername, setGithubUsername] = useState<string>('kevinkgl');
  const [repoName, setRepoName] = useState<string>('diario-multimedia-flutter');
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [allCommandsCopied, setAllCommandsCopied] = useState<boolean>(false);

  const cleanUsername = githubUsername.trim().replace(/^@/, '') || 'tu-usuario';
  const cleanRepo = repoName.trim().replace(/\s+/g, '-') || 'diario-multimedia-flutter';
  const repoUrl = `https://github.com/${cleanUsername}/${cleanRepo}.git`;

  const copyToClipboard = (text: string, stepNumber?: number) => {
    navigator.clipboard.writeText(text);
    if (stepNumber !== undefined) {
      setCopiedStep(stepNumber);
      setTimeout(() => setCopiedStep(null), 2000);
    } else {
      setAllCommandsCopied(true);
      setTimeout(() => setAllCommandsCopied(false), 2000);
    }
  };

  const fullGitScript = `# 1. Inicializar repositorio Git
git init

# 2. Agregar todos los archivos (Flutter, servicios, reglas y docs)
git add .

# 3. Crear el primer commit
git commit -m "feat: Diario Personal Multimedia en Flutter con Cámara, STT, Drive, SQLite y Firestore"

# 4. Asegurar rama principal main
git branch -M main

# 5. Conectar con tu repositorio remoto en GitHub
git remote add origin ${repoUrl}

# 6. Subir a GitHub
git push -u origin main`;

  const downloadScriptFile = (ext: 'sh' | 'bat') => {
    let content = fullGitScript;
    if (ext === 'bat') {
      content = `@echo off\n${fullGitScript.replace(/#/g, 'REM')}\npause`;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subir_a_github.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold">
              <Github className="w-3.5 h-3.5 text-amber-400" />
              Guía de Despliegue en GitHub
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Cómo Subir este Proyecto a tu GitHub
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Configura tu repositorio remoto y sube todo el código fuente (Flutter móvil, SQLite offline, servicios de Google Drive, Firestore y simulador) en menos de 2 minutos.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="https://github.com/new"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Crear Repo en GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Interactive Customizer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-amber-400" />
          Personaliza los Comandos para tu Cuenta
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Escribe tu usuario y el nombre que deseas para tu repositorio para que los comandos se actualicen en tiempo real:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tu Usuario de GitHub:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">@</span>
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="kevin-developer"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre del Repositorio:
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="diario-multimedia-flutter"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 truncate text-slate-300">
            <span className="text-amber-400 font-bold">URL Remota:</span>
            <span className="truncate text-slate-400">{repoUrl}</span>
          </div>
          <button
            onClick={() => copyToClipboard(repoUrl, 99)}
            className="text-amber-400 hover:text-amber-300 shrink-0 font-sans font-semibold text-[11px] ml-2 flex items-center gap-1"
          >
            {copiedStep === 99 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copiedStep === 99 ? 'Copiada' : 'Copiar URL'}
          </button>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-amber-400 font-bold">PASO 1</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">En el Navegador</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Crea el Repositorio en GitHub</h3>
            <ol className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>1. Ve a <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold">github.com/new</a>.</li>
              <li>2. Asigna el nombre: <code className="text-amber-300 font-mono">{cleanRepo}</code>.</li>
              <li>3. Elige si será <strong>Público</strong> o <strong>Privado</strong>.</li>
              <li className="text-rose-300 font-medium bg-rose-950/30 p-2 rounded-lg border border-rose-900/40">
                ⚠️ <strong>Importante:</strong> Deja desmarcadas las casillas de <em>"Add README"</em>, <em>".gitignore"</em> y <em>"License"</em> para no generar conflictos al subir.
              </li>
              <li>4. Haz clic en <strong>"Create repository"</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-amber-400 font-bold">PASO 2</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">En tu Terminal</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Ejecuta los Comandos Git</h3>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Abre tu terminal en la carpeta raíz del proyecto (donde están <code className="text-amber-300">package.json</code> y <code className="text-amber-300">flutter_project/</code>) y corre:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300/90 space-y-1">
              <p>git init</p>
              <p>git add .</p>
              <p>git commit -m "feat: Diario Multimedia"</p>
              <p>git branch -M main</p>
              <p className="truncate">git remote add origin {repoUrl}</p>
              <p>git push -u origin main</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => copyToClipboard(fullGitScript)}
              className="text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 w-full justify-center"
            >
              {allCommandsCopied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
              {allCommandsCopied ? '¡Comandos copiados!' : 'Copiar Todos los Comandos'}
            </button>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-emerald-400 font-bold">PASO 3</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Autenticación</span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Token de GitHub (PAT)</h3>
            <p className="text-xs text-slate-400 mb-2 leading-relaxed">
              GitHub ya no acepta tu contraseña normal en la terminal. Si te pide credenciales durante el <code className="text-amber-300">git push</code>:
            </p>
            <div className="text-xs text-slate-300 space-y-1.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <p>1. Ve a GitHub → <strong>Settings</strong></p>
              <p>2. <strong>Developer Settings</strong> → <strong>Personal access tokens (classic)</strong></p>
              <p>3. Haz clic en <strong>Generate new token</strong> con permiso <code className="text-emerald-400">repo</code></p>
              <p>4. Pega ese token como tu contraseña en la terminal</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <a
              href="https://github.com/settings/tokens/new"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              Generar Token en GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

      </div>

      {/* Terminal Code Block Full View */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Script Completo para Terminal</h3>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => downloadScriptFile('sh')}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
              title="Descargar script para Linux / Mac"
            >
              <Download className="w-3 h-3" />
              Script .sh (Mac/Linux)
            </button>
            <button
              onClick={() => downloadScriptFile('bat')}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5"
              title="Descargar script para Windows"
            >
              <Download className="w-3 h-3" />
              Script .bat (Windows)
            </button>
          </div>
        </div>

        <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed select-all">
          {fullGitScript}
        </pre>
      </div>
    </div>
  );
};
