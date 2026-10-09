import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Mic, 
  MicOff, 
  RotateCcw, 
  Share2, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Square, 
  Sparkles, 
  Lock, 
  FileText, 
  Clock, 
  HardDrive, 
  ExternalLink,
  Info,
  SwitchCamera,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  ArrowDownToLine,
  Zap
} from 'lucide-react';

export interface SavedEntry {
  id: string;
  userId: string;
  transcriptionText: string;
  driveVideoId: string;
  driveUrl: string;
  sharedWith: string | null;
  createdAt: string;
  durationSeconds: number;
  videoBlobUrl?: string;
  syncSource?: 'direct' | 'offline_cached';
}

export interface CachedOfflineItem {
  id: string;
  transcriptionText: string;
  localVideoUrl?: string;
  sharedWith: string | null;
  createdAt: string;
  durationSeconds: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
}

const PRESET_PHRASES = [
  "Hoy no tengo señal en la montaña, pero mi diario guarda todo localmente en SQLite sin perder una sola palabra.",
  "La sincronización automática entre la caché local y Firestore se activará en cuanto recupere cobertura.",
  "Reflexionando en el viaje: la cámara graba el video y el motor transcribe de inmediato.",
  "Agradecido por el progreso de hoy. La regla de privacidad 1:1 protege mis reflexiones."
];

export const PhoneSimulator: React.FC = () => {
  // Connectivity simulation state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Offline SQLite Cache Queue
  const [offlineQueue, setOfflineQueue] = useState<CachedOfflineItem[]>([
    {
      id: 'sqlite_cache_101',
      transcriptionText: 'Entrada registrada en modo avión durante el vuelo: las metas para el siguiente trimestre.',
      sharedWith: 'coach.carrera@mentor.org',
      createdAt: 'Hace 45 min',
      durationSeconds: 18,
      syncStatus: 'pending',
      attempts: 0,
    }
  ]);

  // Simulator camera state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [useSimulatedFeed, setUseSimulatedFeed] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Recording & Transcription state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [soundLevel, setSoundLevel] = useState<number>(0);
  const [audioSupported, setAudioSupported] = useState<boolean>(true);

  // Post-recording modal & save flow
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [lastRecordedVideoUrl, setLastRecordedVideoUrl] = useState<string | null>(null);
  const [sharedEmail, setSharedEmail] = useState<string>('');
  const [shareEmailError, setShareEmailError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStepText, setUploadStepText] = useState<string>('');

  // History / Saved entries
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([
    {
      id: 'entry-seed-1',
      userId: 'kevin.2031.kg@gmail.com',
      transcriptionText: 'Primera entrada sincronizada: evaluando la persistencia de transcripción y video en Google Drive.',
      driveVideoId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
      sharedWith: 'mariana.coach@empresa.com',
      createdAt: 'Ayer, 18:30',
      durationSeconds: 24,
      syncSource: 'direct',
    }
  ]);
  const [selectedEntry, setSelectedEntry] = useState<SavedEntry | null>(null);

  // Web Speech Recognition ref
  const speechRecognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);
  const soundAnimRef = useRef<number | null>(null);

  // Initialize camera
  const startCamera = useCallback(async (facing: 'user' | 'environment' = 'user') => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: true
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasCameraPermission(true);
      setUseSimulatedFeed(false);
    } catch (err) {
      console.warn("Camera permission rejected or device without camera. Using simulated feed.", err);
      setHasCameraPermission(false);
      setUseSimulatedFeed(true);
    }
  }, []);

  useEffect(() => {
    startCamera(isFrontCamera ? 'user' : 'environment');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalSegment = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalSegment += event.results[i][0].transcript + ' ';
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        if (finalSegment) {
          setTranscript(prev => (prev ? `${prev} ${finalSegment.trim()}` : finalSegment.trim()));
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
      };

      speechRecognitionRef.current = recognition;
    } else {
      setAudioSupported(false);
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (soundAnimRef.current) cancelAnimationFrame(soundAnimRef.current);
    };
  }, [startCamera, isFrontCamera]);

  // AUTO-SYNC HOOK: When network recovers, automatically drain offline queue
  useEffect(() => {
    if (isOnline && offlineQueue.some(item => item.syncStatus === 'pending')) {
      triggerAutomaticSync();
    }
  }, [isOnline]);

  const triggerAutomaticSync = () => {
    const pendingItems = offlineQueue.filter(item => item.syncStatus === 'pending');
    if (pendingItems.length === 0 || isAutoSyncing) return;

    setIsAutoSyncing(true);
    setSyncStatusMessage(`Red restablecida: Sincronizando ${pendingItems.length} entrada(s) pendientes de la caché SQLite...`);

    setTimeout(() => {
      // Mark as syncing in SQLite queue
      setOfflineQueue(prev => prev.map(item => item.syncStatus === 'pending' ? { ...item, syncStatus: 'syncing' } : item));

      setTimeout(() => {
        // Convert all pending to synced in Cloud
        const newCloudEntries: SavedEntry[] = pendingItems.map(item => {
          const driveId = '1gDrive_' + Math.random().toString(36).substring(2, 10).toUpperCase();
          return {
            id: `cloud_${Date.now()}_${item.id}`,
            userId: 'kevin.2031.kg@gmail.com',
            transcriptionText: item.transcriptionText,
            driveVideoId: driveId,
            driveUrl: `https://drive.google.com/file/d/${driveId}/view`,
            sharedWith: item.sharedWith,
            createdAt: 'Sincronizado ahora',
            durationSeconds: item.durationSeconds,
            videoBlobUrl: item.localVideoUrl,
            syncSource: 'offline_cached',
          };
        });

        setSavedEntries(prev => [...newCloudEntries, ...prev]);

        // Update queue
        setOfflineQueue(prev => prev.map(item => ({
          ...item,
          syncStatus: 'synced',
          attempts: item.attempts + 1,
        })));

        setIsAutoSyncing(false);
        setSyncStatusMessage('¡Sincronización completada! Todas las transcripciones y videos se subieron a Firestore y Drive.');
        setTimeout(() => setSyncStatusMessage(null), 4000);
      }, 1800);
    }, 1000);
  };

  const toggleCameraFacing = async () => {
    if (isRecording) return;
    const newFacing = !isFrontCamera;
    setIsFrontCamera(newFacing);
    await startCamera(newFacing ? 'user' : 'environment');
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setTranscript('');
    setInterimTranscript('');
    setDurationSeconds(0);
    recordedChunksRef.current = [];

    timerRef.current = window.setInterval(() => {
      setDurationSeconds(s => s + 1);
    }, 1000);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.start();
      } catch (err) {
        console.warn("Speech recognition restart:", err);
      }
    }

    const updateSoundWave = () => {
      setSoundLevel(Math.min(100, Math.floor(25 + Math.random() * 65)));
      soundAnimRef.current = requestAnimationFrame(updateSoundWave);
    };
    updateSoundWave();

    if (mediaStreamRef.current && typeof MediaRecorder !== 'undefined') {
      try {
        const recorder = new MediaRecorder(mediaStreamRef.current);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.start(500);
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.warn("MediaRecorder error:", e);
      }
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (soundAnimRef.current) cancelAnimationFrame(soundAnimRef.current);
    setSoundLevel(0);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (err) {
        console.warn("Stopping speech recognition:", err);
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setTimeout(() => {
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setLastRecordedVideoUrl(url);
        }
      }, 300);
    }

    if (interimTranscript) {
      setTranscript(prev => (prev ? `${prev} ${interimTranscript}` : interimTranscript));
      setInterimTranscript('');
    }

    setShowSaveModal(true);
  };

  const validateSharingEmail = (email: string): boolean => {
    if (!email.trim()) {
      setShareEmailError(null);
      return true;
    }

    if (email.includes(',') || email.includes(';') || email.includes(' ')) {
      setShareEmailError('¡Regla Estricta Violada! Solo puedes compartir con exactamente UNA persona (un único correo). Prohibido listas o grupos.');
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      setShareEmailError('Ingresa un correo electrónico con formato válido.');
      return false;
    }

    setShareEmailError(null);
    return true;
  };

  // Save handler with OFFLINE CACHING logic
  const handleSaveAndUpload = () => {
    if (!validateSharingEmail(sharedEmail)) return;

    // CASE 1: OFFLINE MODE -> Save immediately to SQLite Cache
    if (!isOnline) {
      const newCacheItem: CachedOfflineItem = {
        id: `offline_cache_${Date.now()}`,
        transcriptionText: transcript || 'Entrada grabada offline sin conexión.',
        localVideoUrl: lastRecordedVideoUrl || undefined,
        sharedWith: sharedEmail.trim() || null,
        createdAt: 'Guardado offline recién',
        durationSeconds: durationSeconds || 10,
        syncStatus: 'pending',
        attempts: 0,
      };

      setOfflineQueue(prev => [newCacheItem, ...prev]);
      setShowSaveModal(false);
      setSharedEmail('');
      setSyncStatusMessage('📱 Guardado con éxito en la caché local SQLite. Se auto-sincronizará con Firestore y Drive cuando recuperes red.');
      setTimeout(() => setSyncStatusMessage(null), 5000);
      return;
    }

    // CASE 2: ONLINE MODE -> Upload directly
    setIsUploading(true);
    setUploadProgress(15);
    setUploadStepText('Iniciando Google Sign-In con scope drive.file...');

    setTimeout(() => {
      setUploadProgress(40);
      setUploadStepText('Conectando con Google Drive API v3 y enviando video...');
    }, 700);

    setTimeout(() => {
      setUploadProgress(75);
      setUploadStepText('Subiendo archivo de video temporal (XFile -> Media Stream)...');
    }, 1500);

    setTimeout(() => {
      if (sharedEmail.trim()) {
        setUploadProgress(90);
        setUploadStepText(`Aplicando permiso estricto de lectura en Drive a: ${sharedEmail.trim()}...`);
      } else {
        setUploadProgress(90);
        setUploadStepText('Entrada configurada como privada (sin destinatario externo)...');
      }
    }, 2200);

    setTimeout(() => {
      setUploadProgress(100);
      setUploadStepText('Persistiendo metadatos en Cloud Firestore...');

      const generatedDriveId = '1gDrive_' + Math.random().toString(36).substring(2, 12).toUpperCase();
      const newEntry: SavedEntry = {
        id: `entry-${Date.now()}`,
        userId: 'kevin.2031.kg@gmail.com',
        transcriptionText: transcript || 'Entrada grabada en video y transcrita con éxito.',
        driveVideoId: generatedDriveId,
        driveUrl: `https://drive.google.com/file/d/${generatedDriveId}/view`,
        sharedWith: sharedEmail.trim() || null,
        createdAt: 'Ahora mismo',
        durationSeconds: durationSeconds || 12,
        videoBlobUrl: lastRecordedVideoUrl || undefined,
        syncSource: 'direct',
      };

      setSavedEntries(prev => [newEntry, ...prev]);
      setIsUploading(false);
      setShowSaveModal(false);
      setSharedEmail('');
      setUploadProgress(0);
    }, 2900);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const pendingOfflineCount = offlineQueue.filter(i => i.syncStatus === 'pending').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: Phone Frame & Split-Screen Experience */}
      <div className="lg:col-span-7 flex flex-col items-center">
        
        {/* Connectivity Switcher Simulator Toolbar */}
        <div className="w-full max-w-[410px] mb-3 flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Simular Conectividad:</span>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>En Línea (Wi-Fi/5G)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sin Conexión (Offline)</span>
                </>
              )}
            </button>
          </div>

          {pendingOfflineCount > 0 && isOnline && (
            <button
              onClick={triggerAutomaticSync}
              disabled={isAutoSyncing}
              className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20"
            >
              <RefreshCw className={`w-3 h-3 ${isAutoSyncing ? 'animate-spin' : ''}`} />
              Auto-Sync ({pendingOfflineCount})
            </button>
          )}
        </div>

        {/* Global Sync Notification Banner */}
        {syncStatusMessage && (
          <div className="w-full max-w-[410px] mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
            <Zap className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
            <span>{syncStatusMessage}</span>
          </div>
        )}

        {/* Device Wrapper */}
        <div className="relative w-full max-w-[410px] bg-slate-900 border-[8px] border-slate-800 rounded-[48px] shadow-2xl shadow-amber-500/10 overflow-hidden ring-1 ring-slate-700/50">
          
          {/* Top Notch / Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-between px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500/80 animate-pulse' : 'bg-amber-500/80'}`} />
          </div>

          {/* Screen Content: Height of standard mobile viewport */}
          <div className="h-[730px] flex flex-col bg-slate-950 select-none">
            
            {/* Status bar */}
            <div className="h-10 pt-2 px-6 flex items-center justify-between text-[11px] font-semibold text-slate-400 z-20">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-mono">Flutter 3.24</span>
                {isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                    <Wifi className="w-3 h-3" /> 5G
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded">
                    <WifiOff className="w-3 h-3" /> Offline
                  </span>
                )}
                <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
                  <div className="w-full h-full bg-slate-400 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* Mobile App Bar */}
            <div className="px-4 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 backdrop-blur z-20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20">
                  DM
                </div>
                <div>
                  <h1 className="text-xs font-bold text-white tracking-wide">Diario Multimedia</h1>
                  <p className="text-[9px] text-slate-400">
                    {isOnline ? 'Cámara Frontal + STT en Vivo' : 'Caché SQLite Offline Activa'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleCameraFacing}
                  disabled={isRecording}
                  title="Cambiar Cámara"
                  className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                </button>
                {isOnline ? (
                  <div className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Google Drive
                  </div>
                ) : (
                  <div className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Database className="w-2.5 h-2.5 text-amber-400" />
                    Caché SQLite
                  </div>
                )}
              </div>
            </div>

            {/* SPLIT SCREEN VIEWPORT */}
            <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden">
              
              {/* TOP HALF: Camera Preview (CameraLensDirection.front) */}
              <div className="h-[270px] relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner group">
                {!useSimulatedFeed ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="w-full h-full relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-center p-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-dashed border-amber-500/40 flex items-center justify-center animate-pulse">
                        <Camera className="w-9 h-9 text-amber-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-bold text-[9px] px-1.5 py-0.5 rounded-full shadow">
                        FRONT
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-slate-200">
                      Vista Previa de Cámara Frontal
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-[220px] mt-0.5">
                      {hasCameraPermission === false
                        ? "Permiso de webcam no otorgado; simulador activo."
                        : "CameraPreview de Flutter listo con resolución HD"}
                    </p>
                  </div>
                )}

                {/* Overlays inside camera viewport */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
                  {isRecording ? (
                    <div className="flex items-center gap-1.5 bg-red-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg shadow-red-600/30 backdrop-blur">
                      <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                      <span>REC {formatTimer(durationSeconds)}</span>
                    </div>
                  ) : (
                    <div className="bg-black/50 backdrop-blur text-slate-300 text-[10px] px-2 py-0.5 rounded-md border border-white/10">
                      {isFrontCamera ? 'Cámara Frontal' : 'Cámara Trasera'}
                    </div>
                  )}

                  {!isOnline && (
                    <div className="bg-amber-500/80 backdrop-blur text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-md shadow">
                      Caché Local Offline
                    </div>
                  )}
                </div>

                {/* Audio visualizer badge during recording */}
                {isRecording && (
                  <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur border border-white/10 rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] text-amber-400">
                    <Mic className="w-3 h-3 text-amber-400 animate-pulse" />
                    <div className="flex items-end gap-0.5 h-3">
                      {[3, 7, 12, 8, 4].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-amber-400 rounded-full transition-all duration-75"
                          style={{
                            height: `${Math.max(3, (soundLevel / 100) * h * 1.6)}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BOTTOM HALF: Realistic Notebook Paper Sheet */}
              <div className="flex-1 relative rounded-2xl overflow-hidden shadow-md border border-amber-900/20 flex flex-col">
                <div className="w-full h-full notebook-lines relative overflow-y-auto p-3 pl-14 pr-3 flex flex-col font-handwriting text-slate-900 select-text">
                  
                  {/* Spiral Notebook Rings */}
                  <div className="absolute left-2.5 top-0 bottom-0 flex flex-col justify-around py-3 pointer-events-none">
                    {Array.from({ length: 9 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-3 h-3 rounded-full bg-slate-300 border border-slate-400 shadow-inner"
                      />
                    ))}
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-rose-300/40 pb-1 mb-1 font-sans-ui">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <FileText className="w-3 h-3 text-rose-500" />
                      <span>{new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </div>
                    {isRecording ? (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 animate-pulse">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Transcribiendo en vivo...</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-600 italic">
                        {isOnline ? 'Entrada de voz lista' : 'Modo local sin conexión'}
                      </span>
                    )}
                  </div>

                  {/* Handwritten Content */}
                  <div className="flex-1 text-base leading-[29px] text-slate-800">
                    {transcript || interimTranscript ? (
                      <>
                        <span className="text-slate-900 font-semibold">{transcript}</span>
                        {interimTranscript && (
                          <span className="text-blue-700 bg-blue-100/60 px-1 rounded transition-all">
                            {' '}{interimTranscript}
                          </span>
                        )}
                        {isRecording && (
                          <span className="inline-block w-2 h-4 bg-amber-500 ml-1 animate-pulse align-middle" />
                        )}
                      </>
                    ) : (
                      <p className="text-slate-600/90 text-sm italic font-handwriting pt-2">
                        {isRecording 
                          ? "Habla con naturalidad... El motor Speech-To-Text escribirá tus palabras aquí sobre los renglones en tiempo real." 
                          : "Presiona el botón rojo inferior para comenzar la grabación de video y transcripción simultánea."}
                      </p>
                    )}
                  </div>

                  {/* Quick test phrases */}
                  {!isRecording && (
                    <div className="mt-auto pt-2 border-t border-slate-200/80 font-sans-ui">
                      <div className="flex items-center justify-between text-[10px] text-slate-600 mb-1">
                        <span className="font-semibold">Frases de prueba (Caché & Red):</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {PRESET_PHRASES.slice(0, 2).map((phrase, i) => (
                          <button
                            key={i}
                            onClick={() => setTranscript(phrase)}
                            className="text-[9px] bg-white/80 hover:bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-300 shadow-2xs truncate max-w-[155px] text-left"
                            title={phrase}
                          >
                            "{phrase}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Bottom Controls Bar */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 z-20">
              <button
                onClick={() => {
                  setTranscript('');
                  setInterimTranscript('');
                }}
                disabled={isRecording || (!transcript && !interimTranscript)}
                className="p-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-800 transition"
                title="Limpiar texto"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Main Record Button */}
              <div className="relative">
                {isRecording && (
                  <span className="absolute -inset-2 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
                )}
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isRecording
                      ? 'bg-red-600 text-white ring-4 ring-red-500/30'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-4 ring-amber-500/20'
                  }`}
                  aria-label={isRecording ? 'Detener Grabación' : 'Iniciar Grabación'}
                >
                  {isRecording ? (
                    <Square className="w-5 h-5 fill-current" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-950" />
                  )}
                </button>
              </div>

              <div 
                className={`p-2 rounded-xl transition ${
                  isRecording 
                    ? 'text-amber-400 bg-amber-500/10' 
                    : 'text-slate-400'
                }`}
                title={audioSupported ? 'Speech To Text activo' : 'Speech API no disponible en navegador'}
              >
                {audioSupported ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-rose-400" />}
              </div>
            </div>

          </div>
        </div>

        {/* Offline helper bar */}
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {isOnline
              ? "Conexión activa: las entradas se suben en directo a Google Drive y Firestore."
              : "Modo sin conexión: las entradas se guardan temporalmente en SQLite y se sincronizan al recuperar red."}
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: SQLite Cache Queue, Google Drive & Cloud History */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Card: Offline Cache (SQLite Queue) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Almacenamiento Temporal (Caché SQLite)</h2>
                <p className="text-xs text-slate-400">Cola de sincronización offline con conectividad</p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
              {pendingOfflineCount} pendiente(s)
            </span>
          </div>

          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {offlineQueue.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-400">{item.createdAt}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    item.syncStatus === 'pending'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : item.syncStatus === 'syncing'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {item.syncStatus === 'pending' && '⏳ En Caché Local'}
                    {item.syncStatus === 'syncing' && '🔄 Subiendo a Nube...'}
                    {item.syncStatus === 'synced' && '✅ Sincronizado'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-handwriting text-sm line-clamp-2">
                  "{item.transcriptionText}"
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 font-mono">
                  <span>Reintentos: {item.attempts}</span>
                  {item.sharedWith && <span>Destinatario 1:1: {item.sharedWith}</span>}
                </div>
              </div>
            ))}

            {offlineQueue.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500">
                No hay elementos en la caché local.
              </div>
            )}
          </div>

          {/* Sync Trigger button */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {isOnline ? "Conexión detectada." : "Sin conexión a internet."}
            </span>
            <button
              onClick={triggerAutomaticSync}
              disabled={!isOnline || pendingOfflineCount === 0 || isAutoSyncing}
              className="text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 rounded-xl disabled:opacity-40 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${isAutoSyncing ? 'animate-spin' : ''}`} />
              {isAutoSyncing ? 'Sincronizando...' : 'Sincronizar Cola Ahora'}
            </button>
          </div>
        </div>

        {/* Card: Saved Entries in Cloud Firestore */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Entradas en Cloud Firestore ({savedEntries.length})</h2>
            </div>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Colección: diary_entries
            </span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {savedEntries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`p-3.5 rounded-xl border transition cursor-pointer ${
                  selectedEntry?.id === entry.id
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {entry.createdAt}
                  </span>
                  <div className="flex items-center gap-2">
                    {entry.syncSource === 'offline_cached' && (
                      <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                        Desde Caché
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">{entry.durationSeconds}s</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 font-handwriting text-sm leading-relaxed">
                  "{entry.transcriptionText}"
                </p>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1 text-slate-400">
                    <HardDrive className="w-3 h-3 text-amber-400" />
                    <span className="font-mono text-[10px] text-slate-300 truncate max-w-[130px]">
                      {entry.driveVideoId}
                    </span>
                  </div>

                  {entry.sharedWith ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Share2 className="w-2.5 h-2.5" />
                      1:1 con {entry.sharedWith.split('@')[0]}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      <Lock className="w-2.5 h-2.5" />
                      Privada
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {selectedEntry && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-amber-500/30 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-sm">Detalles de la Entrada</span>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Texto Manuscrito Transcrito:</span>
                <p className="text-slate-200 font-handwriting text-base leading-snug mt-0.5">
                  "{selectedEntry.transcriptionText}"
                </p>
              </div>

              {selectedEntry.videoBlobUrl && (
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold mb-1">Video Local Grabado:</span>
                  <video 
                    src={selectedEntry.videoBlobUrl} 
                    controls 
                    className="w-full h-32 rounded-lg bg-black object-contain"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px]">Google Drive File ID:</span>
                  <span className="font-mono text-slate-300">{selectedEntry.driveVideoId}</span>
                </div>
                <a
                  href={selectedEntry.driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Ver en Drive <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Save Flow (Adapts automatically if Offline or Online) */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isOnline 
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                }`}>
                  {isOnline ? <Upload className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isOnline ? 'Subir a Drive & Guardar Entrada' : 'Guardar en Almacenamiento Temporal (Caché)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Duración: {formatTimer(durationSeconds)} • {isOnline ? 'Modo En Línea' : 'Sin conexión activa (Modo Offline)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={isUploading}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Offline notification badge in modal */}
            {!isOnline && (
              <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>
                  El dispositivo está sin conexión. Los metadatos y el video se guardarán en la base de datos temporal <strong>SQLite</strong> local y se auto-sincronizarán con Google Drive y Firestore tan pronto como vuelva la red.
                </span>
              </div>
            )}

            {/* Transcript Preview in notebook box */}
            <div className="my-4">
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Texto Transcrito Simultáneamente:
              </label>
              <div className="p-3.5 rounded-xl notebook-lines text-slate-900 font-handwriting text-lg leading-relaxed max-h-32 overflow-y-auto border border-rose-200 shadow-inner">
                {transcript || "Sin transcripción audible registrada."}
              </div>
            </div>

            {/* Strict Sharing Rule Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  Compartir con EXACTAMENTE UNA Persona (Opcional):
                </label>
                <span className="text-[10px] text-amber-400 font-mono font-semibold">Regla Estricta 1:1</span>
              </div>
              
              <div className="relative mt-1">
                <input
                  type="email"
                  value={sharedEmail}
                  onChange={(e) => {
                    setSharedEmail(e.target.value);
                    if (shareEmailError) validateSharingEmail(e.target.value);
                  }}
                  disabled={isUploading}
                  placeholder="ejemplo: confidencial@amigo.com"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition"
                />
              </div>

              {shareEmailError && (
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{shareEmailError}</span>
                </div>
              )}
            </div>

            {/* Upload Progress Bar if active */}
            {isUploading && (
              <div className="my-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-medium">{uploadStepText}</span>
                  <span className="font-mono text-slate-400">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAndUpload}
                disabled={isUploading}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
              >
                {isUploading ? (
                  <>Subiendo a Google Drive...</>
                ) : !isOnline ? (
                  <>
                    <Database className="w-4 h-4" />
                    Guardar en Caché Temporal (Offline)
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Subir a Drive y Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
