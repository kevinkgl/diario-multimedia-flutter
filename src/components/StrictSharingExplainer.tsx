import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  UserCheck, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  FileCode2, 
  Terminal,
  Database,
  ArrowRight
} from 'lucide-react';

export const StrictSharingExplainer: React.FC = () => {
  const [testEmailInput, setTestEmailInput] = useState<string>('mentor@universidad.edu');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    reason: string;
  }>({
    valid: true,
    reason: 'Correo individual válido. Cumple la regla de privacidad 1:1.'
  });

  const runValidationTest = (value: string) => {
    setTestEmailInput(value);
    const trimmed = value.trim();

    if (!trimmed) {
      setValidationResult({
        valid: true,
        reason: 'Campo null / vacío. La entrada queda 100% privada para el autor.'
      });
      return;
    }

    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes(' ')) {
      setValidationResult({
        valid: false,
        reason: 'Violación Estricta: Se detectaron múltiples destinatarios o caracteres separadores (, ; espacio). Prohibido por regla 1:1.'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setValidationResult({
        valid: false,
        reason: 'Formato de correo electrónico inválido.'
      });
      return;
    }

    setValidationResult({
      valid: true,
      reason: 'Correo individual válido. Cumple la regla de privacidad 1:1.'
    });
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-500/10 via-slate-900 to-slate-900 border border-rose-500/20 rounded-3xl p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
            Arquitectura de Seguridad & Privacidad
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Regla de Compartición Estricta (Exactamente 1 Persona)
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl mt-2 leading-relaxed">
          Garantía criptográfica y a nivel de base de datos de que cada entrada íntima del diario solo puede ser vista por el autor o compartida con un único confidente/mentor (<code className="text-rose-300 font-mono">shared_with</code>).
        </p>
      </div>

      {/* Comparison Grid: Standard vs Strict Rule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Anti-pattern: Multiple sharing / Lists */}
        <div className="bg-slate-900/90 border border-rose-900/30 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Anti-Patrón (Rechazado)
              </span>
              <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-mono">
                List&lt;String&gt; shared_with
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">
              Compartición Grupal o con Múltiples Correos
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              En redes sociales convencionales se usan arrays o listas de emails. Sin embargo, para un diario íntimo personal, esto rompe el principio de confidencialidad y permite fugas de información o invitaciones masivas no deseadas.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300/80">
              {`// PELIGRO: No cumple el requisito estricto
{
  "shared_with": [
    "amigo1@test.com", 
    "amigo2@test.com" // ❌ PROHIBIDO
  ]
}`}
            </div>
          </div>
        </div>

        {/* The Implemented Pattern: Strict Single Email */}
        <div className="bg-slate-900/90 border border-emerald-900/30 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Patrón Implementado (Garantizado)
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                String? shared_with (Único)
              </span>
            </div>
            <h3 className="text-sm font-bold text-white mb-2">
              Relación 1:1 Exclusiva y Verificable
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              El esquema almacena un único string normalizado. Si no se especifica, el valor es <code className="text-emerald-300">null</code>. Si se especifica, debe ser un único correo validado por constructor Dart y por regla de Firestore.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300">
              {`// CORRECTO: Riguroso 1:1
{
  "user_id": "usr_author_123",
  "transcription_text": "...",
  "drive_video_id": "1gDrive_XYZ",
  "shared_with": "confidente@mentor.com" // ✅ EXACTAMENTE 1
}`}
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Validator Sandbox */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white">
            Sandbox de Validación de la Regla Estricta
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Prueba ingresar un correo único o intentar ingresar múltiples correos separados por comas para comprobar cómo el modelo y las reglas rechazan violaciones:
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <input
            type="text"
            value={testEmailInput}
            onChange={(e) => runValidationTest(e.target.value)}
            placeholder="Escribe un correo o prueba con: juan@test.com, pedro@test.com"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs font-mono text-slate-200 outline-none focus:border-amber-500"
          />

          <div className="flex gap-2">
            <button
              onClick={() => runValidationTest('amigo1@test.com, amigo2@test.com')}
              className="px-3 py-2 text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl whitespace-nowrap transition"
            >
              Probar Violación (2 emails)
            </button>
            <button
              onClick={() => runValidationTest('ana.confidente@gmail.com')}
              className="px-3 py-2 text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl whitespace-nowrap transition"
            >
              Probar Válido (1 email)
            </button>
          </div>
        </div>

        {/* Validation Result Box */}
        <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 transition ${
          validationResult.valid 
            ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-200' 
            : 'bg-rose-950/20 border-rose-900/40 text-rose-200'
        }`}>
          {validationResult.valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <span className="font-bold block">
              {validationResult.valid ? 'APROBADO POR LA REGLA 1:1' : 'RECHAZADO POR LA REGLA 1:1'}
            </span>
            <p className="mt-0.5 text-slate-300">{validationResult.reason}</p>
          </div>
        </div>
      </div>

      {/* Triple Layer Enforcement (Client, Backend, Storage) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          Blindaje en 3 Capas Independientes
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-amber-400 font-bold">CAPA 1: DART DOMAIN</span>
            <h4 className="text-xs font-bold text-white">Validación en Constructor</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              El constructor de <code className="text-amber-300">DiaryEntry</code> ejecuta <code className="text-amber-300">_validateSingleEmail()</code> impidiendo comas o listas antes de serializar a JSON.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-emerald-400 font-bold">CAPA 2: GOOGLE DRIVE API</span>
            <h4 className="text-xs font-bold text-white">Permiso Reader Específico</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <code className="text-amber-300">GoogleDriveService</code> invoca <code className="text-amber-300">permissions.create</code> pasando un único <code className="text-amber-300">emailAddress</code> con rol <code className="text-amber-300">reader</code>. No habilita link público universal.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-rose-400 font-bold">CAPA 3: FIRESTORE RULES</span>
            <h4 className="text-xs font-bold text-white">Seguridad a Nivel de Servidor</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <code className="text-amber-300">firestore.rules</code> evalúa si el token JWT del usuario solicitante coincide con el creador O con el <code className="text-amber-300">shared_with</code> exacto en minúsculas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
