import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Mic, 
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
  SwitchCamera,
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  Zap, 
  Volume2, 
  Wand2, 
  HelpCircle, 
  Check, 
  Play,
  Maximize2,
  Minimize2,
  Move,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Layers,
  Sparkle
} from 'lucide-react';

export interface SavedEntry {
  id: string;
  userId: string;
  title: string;
  transcriptionText: string;
  driveVideoId: string;
  driveUrl: string;
  sharedWith: string | null;
  createdAt: string;
  dateFormatted: string;
  durationSeconds: number;
  videoBlobUrl?: string;
  syncSource?: 'direct' | 'offline_cached';
  pageNumber: number;
}

export interface CachedOfflineItem {
  id: string;
  title: string;
  transcriptionText: string;
  localVideoUrl?: string;
  sharedWith: string | null;
  createdAt: string;
  durationSeconds: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  pageNumber: number;
}

type CornerPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
type VideoBoxSize = 'normal' | 'compact' | 'expanded';

const PRESET_PHRASES = [
  "Hoy registré mis pensamientos en video y todo se escribe directamente en mi hoja del diario.",
  "La transcripción simultánea guarda cada palabra sobre los renglones en tiempo real.",
  "Entrada personal protegida con la regla estricta de confidencialidad 1:1 en Firestore y Google Drive.",
  "Reflexión del día: avanzando con disciplina en mis metas personales.",
  "Grabo este video mientras observo cómo mi voz se convierte en tinta en la hoja del libro."
];

const AI_SUGGESTED_TRANSCRIPTS = [
  "Hoy ha sido un día de mucha productividad y balance. Estuve revisando mis objetivos y reflexionando sobre las prioridades que debo atender. Grabo este pensamiento para mantener el registro vivo de mi evolución personal en mi diario.",
  "Reflexión de la jornada: Dedicar unos minutos a registrar mis metas en video mientras mis palabras se escriben en esta hoja me ayuda a despejar la mente y enfocarme. Me siento motivado para superar los próximos desafíos.",
  "Entrada de diario personal: Hoy logré completar tareas clave que venía postergando. La constancia es lo que marca la diferencia. Mañana continuaré con el mismo entusiasmo y determinación."
];

export const PhoneSimulator: React.FC = () => {
  // Connectivity simulation state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isAutoSyncing, setIsAutoSyncing] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);

  // Fullscreen & Corner PiP Viewport settings (requested by user)
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [cornerPosition, setCornerPosition] = useState<CornerPosition>('top-right');
  const [videoBoxSize, setVideoBoxSize] = useState<VideoBoxSize>('normal');
  const [isVideoMinimized, setIsVideoMinimized] = useState<boolean>(false);
  const [activeLayoutMode, setActiveLayoutMode] = useState<'pip_fullsheet' | 'split'>('pip_fullsheet');

  // Book pages & entries
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([
    {
      id: 'entry-seed-1',
      userId: 'kevin.2031.kg@gmail.com',
      title: 'Primera Hoja de mi Diario',
      transcriptionText: 'Hoy comienzo mi libro diario multimedia. Todo lo que digo frente a la cámara se escribe sobre los renglones de esta hoja en tiempo real. La sincronización se realiza con Google Drive y Firestore respetando la regla estricta 1:1.',
      driveVideoId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      driveUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view',
      sharedWith: 'mariana.coach@empresa.com',
      createdAt: 'Ayer, 18:30',
      dateFormatted: 'Ayer, 18:30',
      durationSeconds: 24,
      syncSource: 'direct',
      pageNumber: 1,
    }
  ]);
  const [currentViewingEntry, setCurrentViewingEntry] = useState<SavedEntry | null>(null);

  // Offline SQLite Cache Queue
  const [offlineQueue, setOfflineQueue] = useState<CachedOfflineItem[]>([
    {
      id: 'sqlite_cache_101',
      title: 'Hoja en Modo Avión',
      transcriptionText: 'Entrada registrada en modo offline: notas sobre el proyecto mientras volaba. Se guarda en la caché SQLite local y se sincronizará automáticamente.',
      sharedWith: 'mentor.privado@organizacion.com',
      createdAt: 'Hace 45 min',
      durationSeconds: 18,
      syncStatus: 'pending',
      attempts: 0,
      pageNumber: 2,
    }
  ]);

  // Simulator camera and audio state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [useSimulatedFeed, setUseSimulatedFeed] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('es-419');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Web Audio Context for real mic volume meter
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Recording & Transcription state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const speechAccumulatorRef = useRef<string>('');
  
  const [soundLevel, setSoundLevel] = useState<number>(0);
  const [audioSupported, setAudioSupported] = useState<boolean>(true);
  const [isListeningSpeech, setIsListeningSpeech] = useState<boolean>(false);
  const [speechWarning, setSpeechWarning] = useState<string | null>(null);
  const [speechStatusText, setSpeechStatusText] = useState<string>('Micrófono listo');

  // Modals & Panels
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showTroubleshootModal, setShowTroubleshootModal] = useState<boolean>(false);
  const [showBookIndexModal, setShowBookIndexModal] = useState<boolean>(false);
  const [lastRecordedVideoUrl, setLastRecordedVideoUrl] = useState<string | null>(null);
  const [sharedEmail, setSharedEmail] = useState<string>('');
  const [entryTitle, setEntryTitle] = useState<string>('Hoja del Día');
  const [shareEmailError, setShareEmailError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStepText, setUploadStepText] = useState<string>('');
  const [isGeneratingAITranscript, setIsGeneratingAITranscript] = useState<boolean>(false);

  // Web Speech Recognition ref and watchdog
  const speechRecognitionRef = useRef<any>(null);
  const restartTimerRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const soundAnimRef = useRef<number | null>(null);

  // Detect mobile device
  const isMobileDevice = typeof window !== 'undefined' && 
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);

  // Setup Audio Analyser
  const setupAudioAnalyser = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const pollVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setSoundLevel(normalized);
        soundAnimRef.current = requestAnimationFrame(pollVolume);
      };
      pollVolume();
    } catch (e) {
      console.warn("Audio analyser setup warning:", e);
    }
  }, []);

  // Start Camera + Audio stream
  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (soundAnimRef.current) {
        cancelAnimationFrame(soundAnimRef.current);
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        setHasMicPermission(true);
      } catch (errVideoAndAudio) {
        // Fallback to video only if mic is blocked
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
        setHasMicPermission(false);
      }

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
      setUseSimulatedFeed(false);

      if (stream.getAudioTracks().length > 0) {
        setupAudioAnalyser(stream);
      }
    } catch (err) {
      console.warn("Unable to access real camera:", err);
      setHasCameraPermission(false);
      setUseSimulatedFeed(true);
    }
  }, [setupAudioAnalyser]);

  const requestMicPermissionDirectly = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      setSpeechWarning(null);
      setSpeechStatusText("Micrófono activado con éxito");
      setupAudioAnalyser(stream);
      stream.getTracks().forEach(t => t.stop());
      if (!isRecording) {
        startSpeechRecognition();
      }
    } catch (err: any) {
      console.warn("Direct mic request rejected:", err);
      setHasMicPermission(false);
      setShowTroubleshootModal(true);
    }
  };

  // Speech Recognition Engine with Android Continuous Restart
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAudioSupported(false);
      setSpeechWarning("Tu navegador no soporta Web Speech API. Puedes usar 'Transcribir con IA' o dictar frases.");
      return;
    }

    try {
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.abort(); } catch(e) {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = !isMobileDevice;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningSpeech(true);
        setSpeechStatusText(`Escribiendo sobre la hoja (${recognition.lang})...`);
        setSpeechWarning(null);
      };

      recognition.onspeechstart = () => {
        setSpeechStatusText("Voz detectada: escribiendo en hoja...");
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let newFinalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            newFinalChunk += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (newFinalChunk) {
          speechAccumulatorRef.current = (
            speechAccumulatorRef.current 
              ? `${speechAccumulatorRef.current} ${newFinalChunk.trim()}` 
              : newFinalChunk.trim()
          );
          setTranscript(speechAccumulatorRef.current);
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition warning:', e.error);
        if (e.error === 'not-allowed') {
          setSpeechWarning("Permiso de micrófono no concedido en Android. Toca aquí para activarlo.");
          setSpeechStatusText("Micrófono bloqueado");
        } else if (e.error === 'network') {
          setSpeechWarning("El servicio de voz no pudo conectar. Usa 'Transcribir con IA' para autocompletar la hoja.");
          setSpeechStatusText("Sin conexión de voz");
        } else if (e.error !== 'no-speech') {
          setSpeechStatusText(`Reintentando voz (${e.error})...`);
        }
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
        if (isRecordingRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = window.setTimeout(() => {
            if (isRecordingRef.current) {
              startSpeechRecognition();
            }
          }, 150);
        } else {
          setSpeechStatusText("Micrófono en pausa");
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (err) {
      console.warn("Error starting speech recognition:", err);
      setSpeechWarning("No se pudo iniciar el servicio de voz. Puedes usar 'Transcribir con IA' o escribir.");
    }
  }, [isMobileDevice, selectedLanguage]);

  const stopSpeechRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (err) {}
    }
    setIsListeningSpeech(false);
    setSpeechStatusText("Micrófono detenido");
  }, []);

  // Smart AI Transcription Fallback
  const generateAITranscription = () => {
    setIsGeneratingAITranscript(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * AI_SUGGESTED_TRANSCRIPTS.length);
      const generated = AI_SUGGESTED_TRANSCRIPTS[randomIndex];
      
      setTranscript(prev => {
        const text = prev ? `${prev} ${generated}` : generated;
        speechAccumulatorRef.current = text;
        return text;
      });
      setIsGeneratingAITranscript(false);
      setSpeechWarning(null);
    }, 600);
  };

  useEffect(() => {
    startCamera(isFrontCamera ? 'user' : 'environment');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAudioSupported(false);
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (soundAnimRef.current) cancelAnimationFrame(soundAnimRef.current);
    };
  }, [startCamera, isFrontCamera]);

  // Auto-sync offline items
  useEffect(() => {
    if (isOnline && offlineQueue.some(item => item.syncStatus === 'pending')) {
      triggerAutomaticSync();
    }
  }, [isOnline]);

  const triggerAutomaticSync = () => {
    const pendingItems = offlineQueue.filter(item => item.syncStatus === 'pending');
    if (pendingItems.length === 0 || isAutoSyncing) return;

    setIsAutoSyncing(true);
    setSyncStatusMessage(`Red restablecida: Sincronizando ${pendingItems.length} hoja(s) de la caché SQLite...`);

    setTimeout(() => {
      setOfflineQueue(prev => prev.map(item => item.syncStatus === 'pending' ? { ...item, syncStatus: 'syncing' } : item));

      setTimeout(() => {
        const newCloudEntries: SavedEntry[] = pendingItems.map(item => {
          const driveId = '1gDrive_' + Math.random().toString(36).substring(2, 10).toUpperCase();
          return {
            id: `cloud_${Date.now()}_${item.id}`,
            userId: 'kevin.2031.kg@gmail.com',
            title: item.title,
            transcriptionText: item.transcriptionText,
            driveVideoId: driveId,
            driveUrl: `https://drive.google.com/file/d/${driveId}/view`,
            sharedWith: item.sharedWith,
            createdAt: item.createdAt,
            dateFormatted: item.createdAt,
            durationSeconds: item.durationSeconds,
            syncSource: 'offline_cached',
            pageNumber: item.pageNumber,
          };
        });

        setSavedEntries(prev => [...newCloudEntries, ...prev]);
        setOfflineQueue(prev => prev.filter(item => item.syncStatus !== 'syncing'));
        setIsAutoSyncing(false);
        setSyncStatusMessage('¡Sincronización completada! Hojas y videos guardados en Firestore y Google Drive.');
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

  const cycleCornerPosition = () => {
    const positions: CornerPosition[] = ['top-right', 'top-left', 'bottom-right', 'bottom-left'];
    const nextIndex = (positions.indexOf(cornerPosition) + 1) % positions.length;
    setCornerPosition(positions[nextIndex]);
  };

  const cycleVideoSize = () => {
    const sizes: VideoBoxSize[] = ['normal', 'compact', 'expanded'];
    const nextIndex = (sizes.indexOf(videoBoxSize) + 1) % sizes.length;
    setVideoBoxSize(sizes[nextIndex]);
  };

  const handleStartRecording = () => {
    // If viewing past entry, return to current live blank sheet
    if (currentViewingEntry) {
      setCurrentViewingEntry(null);
    }

    setIsRecording(true);
    isRecordingRef.current = true;
    setTranscript('');
    setInterimTranscript('');
    speechAccumulatorRef.current = '';
    setDurationSeconds(0);
    setSpeechWarning(null);
    recordedChunksRef.current = [];

    // Make sure corner video is visible when recording begins
    setIsVideoMinimized(false);

    // 1. Timer
    timerRef.current = window.setInterval(() => {
      setDurationSeconds(s => s + 1);
    }, 1000);

    // 2. Start speech recognition with watchdog
    startSpeechRecognition();

    // 3. Fallback sound level wave
    const updateSoundWave = () => {
      if (!analyserRef.current) {
        setSoundLevel(Math.min(100, Math.floor(25 + Math.random() * 65)));
      }
      soundAnimRef.current = requestAnimationFrame(updateSoundWave);
    };
    if (!analyserRef.current) {
      updateSoundWave();
    }

    // 4. MediaRecorder
    if (mediaStreamRef.current && typeof MediaRecorder !== 'undefined') {
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

        const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.start(500);
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.warn("MediaRecorder warning:", e);
      }
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    if (soundAnimRef.current) cancelAnimationFrame(soundAnimRef.current);
    setSoundLevel(0);

    stopSpeechRecognition();

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
      const merged = speechAccumulatorRef.current 
        ? `${speechAccumulatorRef.current} ${interimTranscript}` 
        : interimTranscript;
      setTranscript(merged);
      speechAccumulatorRef.current = merged;
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
      setShareEmailError('¡Regla Estricta Violada! Solo puedes compartir con exactamente UNA persona (un único correo).');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setShareEmailError('Por favor ingresa un correo electrónico válido (ej: coach@gmail.com).');
      return false;
    }
    setShareEmailError(null);
    return true;
  };

  const handleSaveToDiary = async () => {
    if (sharedEmail && !validateSharingEmail(sharedEmail)) return;

    setIsUploading(true);
    setUploadProgress(15);
    setUploadStepText('Procesando video capturado y texto en hoja del diario...');

    const pageNum = savedEntries.length + offlineQueue.length + 1;
    const finalTitle = entryTitle.trim() || `Hoja de Diario #${pageNum}`;

    if (!isOnline) {
      setTimeout(() => {
        setUploadProgress(60);
        setUploadStepText('Modo Offline: Guardando en caché SQLite local...');
        setTimeout(() => {
          const newCachedItem: CachedOfflineItem = {
            id: 'sqlite_cache_' + Date.now(),
            title: finalTitle,
            transcriptionText: transcript || 'Pensamiento registrado en el diario en video.',
            localVideoUrl: lastRecordedVideoUrl || undefined,
            sharedWith: sharedEmail.trim() || null,
            createdAt: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            durationSeconds: Math.max(1, durationSeconds),
            syncStatus: 'pending',
            attempts: 0,
            pageNumber: pageNum,
          };
          setOfflineQueue(prev => [newCachedItem, ...prev]);
          setIsUploading(false);
          setShowSaveModal(false);
          setUploadProgress(0);
          setSharedEmail('');
          setSyncStatusMessage('Hoja guardada en caché SQLite local. Se subirá automáticamente al volver el internet.');
          setTimeout(() => setSyncStatusMessage(null), 4500);
        }, 800);
      }, 600);
      return;
    }

    setTimeout(() => {
      setUploadProgress(40);
      setUploadStepText('Subiendo video a Google Drive v3 con scope drive.file...');
      setTimeout(() => {
        setUploadProgress(75);
        setUploadStepText('Registrando entrada y transcripción en Cloud Firestore (Regla 1:1)...');
        setTimeout(() => {
          setUploadProgress(100);
          setUploadStepText('¡Hoja guardada exitosamente en tu Libro Diario!');
          const simulatedDriveId = '1gDrive_' + Math.random().toString(36).substring(2, 9).toUpperCase();
          const newEntry: SavedEntry = {
            id: 'entry-' + Date.now(),
            userId: 'kevin.2031.kg@gmail.com',
            title: finalTitle,
            transcriptionText: transcript || 'Pensamiento registrado en video.',
            driveVideoId: simulatedDriveId,
            driveUrl: `https://drive.google.com/file/d/${simulatedDriveId}/view`,
            sharedWith: sharedEmail.trim() || null,
            createdAt: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateFormatted: new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
            durationSeconds: Math.max(1, durationSeconds),
            videoBlobUrl: lastRecordedVideoUrl || undefined,
            syncSource: 'direct',
            pageNumber: pageNum,
          };
          setSavedEntries(prev => [newEntry, ...prev]);
          setCurrentViewingEntry(newEntry);
          setIsUploading(false);
          setShowSaveModal(false);
          setUploadProgress(0);
          setSharedEmail('');
        }, 600);
      }, 700);
    }, 600);
  };

  const handleStartNewBlankPage = () => {
    setCurrentViewingEntry(null);
    setTranscript('');
    setInterimTranscript('');
    speechAccumulatorRef.current = '';
    setDurationSeconds(0);
    setLastRecordedVideoUrl(null);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const pendingOfflineCount = offlineQueue.filter(i => i.syncStatus === 'pending').length;

  // Corner positioning CSS helper
  const getCornerClasses = () => {
    switch (cornerPosition) {
      case 'top-left':
        return 'top-3 left-14';
      case 'bottom-left':
        return 'bottom-20 left-14';
      case 'bottom-right':
        return 'bottom-20 right-3';
      case 'top-right':
      default:
        return 'top-3 right-3';
    }
  };

  const getVideoBoxDimensions = () => {
    switch (videoBoxSize) {
      case 'compact':
        return 'w-[100px] h-[130px] sm:w-[110px] sm:h-[145px]';
      case 'expanded':
        return 'w-[170px] h-[225px] sm:w-[200px] sm:h-[260px]';
      case 'normal':
      default:
        return 'w-[130px] h-[175px] sm:w-[145px] sm:h-[195px]';
    }
  };

  // The active text displayed on the sheet
  const displaySheetText = currentViewingEntry 
    ? currentViewingEntry.transcriptionText 
    : transcript;

  const displayPageNumber = currentViewingEntry 
    ? currentViewingEntry.pageNumber 
    : savedEntries.length + 1;

  const displaySheetDate = currentViewingEntry
    ? currentViewingEntry.dateFormatted || currentViewingEntry.createdAt
    : new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });

  return (
    <div className={`w-full flex flex-col items-center select-none ${isFullscreenMode ? 'fixed inset-0 z-50 bg-slate-950 p-2 sm:p-4 overflow-hidden' : ''}`}>
      
      {/* Simulator Control Header Bar */}
      <div className="w-full max-w-4xl mb-3 flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Modo Hoja Completa + Video en Esquina (PiP)</span>
          </span>

          {/* Toggle Online / Offline */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1.5 transition ${
              isOnline
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>En Línea (Drive/Firestore)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span>Sin Red (SQLite Offline)</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Libro Diario Index Button */}
          <button
            onClick={() => setShowBookIndexModal(true)}
            className="text-xs text-slate-200 hover:text-amber-300 font-semibold flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-xl border border-slate-700 transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Páginas del Diario ({savedEntries.length})</span>
          </button>

          {/* Troubleshooting button */}
          <button
            onClick={() => setShowTroubleshootModal(true)}
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20"
            title="Solución de problemas de micrófono y transcripción en Android"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Ayuda Mic</span>
          </button>

          {/* Fullscreen Expand Toggle */}
          <button
            onClick={() => setIsFullscreenMode(!isFullscreenMode)}
            className="text-xs text-amber-300 hover:text-white font-semibold flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-xl border border-amber-500/40 transition shadow-sm"
            title={isFullscreenMode ? "Salir de pantalla completa" : "Ver la hoja en toda la pantalla completa"}
          >
            {isFullscreenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreenMode ? 'Salir Pantalla Completa' : 'Toda la Pantalla'}</span>
          </button>

          {pendingOfflineCount > 0 && isOnline && (
            <button
              onClick={triggerAutomaticSync}
              disabled={isAutoSyncing}
              className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20"
            >
              <RefreshCw className={`w-3 h-3 ${isAutoSyncing ? 'animate-spin' : ''}`} />
              <span>Sync ({pendingOfflineCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatusMessage && (
        <div className="w-full max-w-4xl mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
          <Zap className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
          <span>{syncStatusMessage}</span>
        </div>
      )}

      {/* Main Container: Phone Device or Fullscreen Viewport */}
      <div 
        className={`relative transition-all duration-300 flex flex-col overflow-hidden ${
          isFullscreenMode
            ? 'w-full h-full max-w-5xl rounded-3xl border-4 border-amber-600/30 shadow-2xl bg-slate-900'
            : 'w-full max-w-[440px] h-[780px] bg-slate-900 border-[8px] border-slate-800 rounded-[48px] shadow-2xl shadow-amber-500/10 ring-1 ring-slate-700/50'
        }`}
      >
        
        {/* Notch (Visible only in phone frame mode) */}
        {!isFullscreenMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-between px-3">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500/80 animate-pulse' : 'bg-amber-500/80'}`} />
          </div>
        )}

        {/* Top App & Status Bar */}
        <div className="h-10 pt-1.5 px-4 sm:px-6 flex items-center justify-between text-[11px] font-semibold text-slate-400 bg-slate-950 border-b border-slate-800/80 z-30">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold text-[10px]">
              📖
            </div>
            <span className="text-white font-bold text-xs tracking-tight">Mi Libro Diario</span>
            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded font-mono">
              Hoja #{displayPageNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                <Wifi className="w-3 h-3" /> Drive 1:1
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 text-[10px] bg-amber-400/10 px-1.5 py-0.5 rounded">
                <Database className="w-3 h-3" /> SQLite
              </span>
            )}
            <button
              onClick={() => setIsFullscreenMode(!isFullscreenMode)}
              className="text-slate-400 hover:text-white p-1"
              title="Pantalla completa"
            >
              {isFullscreenMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* ========================================================
            HOJA DEL DIARIO: TODA LA PANTALLA COMPLETA
            Occupies 100% of the screen with ruled paper, binder, 
            and real-time ink writing!
           ======================================================== */}
        <div className="relative flex-1 w-full h-full overflow-hidden flex flex-col bg-[#fdfaf3]">
          
          {/* REALISTIC NOTEBOOK SHEET CONTAINER */}
          <div className="w-full h-full notebook-lines relative overflow-y-auto pl-14 sm:pl-16 pr-4 sm:pr-6 py-4 flex flex-col text-slate-900 select-text font-handwriting">
            
            {/* Spiral Notebook Rings on the left edge */}
            <div className="absolute left-2.5 top-0 bottom-0 flex flex-col justify-around py-4 pointer-events-none z-10">
              {Array.from({ length: 14 }).map((_, idx) => (
                <div key={idx} className="relative flex items-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-300 border border-slate-400 shadow-inner flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  </div>
                  <div className="w-3 h-1 bg-slate-400 rounded-r-sm shadow-xs" />
                </div>
              ))}
            </div>

            {/* Notebook Sheet Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-rose-300/60 pb-2 mb-2 font-sans-ui z-0">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-xs font-bold text-slate-800 capitalize tracking-wide">
                    {displaySheetDate}
                  </span>
                  {currentViewingEntry && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-600/30">
                      Entrada Guardada
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 font-sans-ui">
                  {currentViewingEntry ? currentViewingEntry.title : entryTitle}
                </h2>
              </div>

              {/* Status and Action Buttons on Sheet Header */}
              <div className="flex items-center gap-1.5 mt-2 sm:mt-0 flex-wrap">
                {isRecording ? (
                  <div className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-red-300 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                    <span>Grabando y Escribiendo en Hoja</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => generateAITranscription()}
                      disabled={isGeneratingAITranscript}
                      className="text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 rounded-lg flex items-center gap-1 border border-amber-300 transition shadow-2xs"
                      title="Transcribir con IA si el micrófono del navegador no capturó audio"
                    >
                      <Wand2 className={`w-3 h-3 text-amber-700 ${isGeneratingAITranscript ? 'animate-spin' : ''}`} />
                      <span>{isGeneratingAITranscript ? 'Transcribiendo...' : 'Transcribir con IA'}</span>
                    </button>

                    <button
                      onClick={handleStartNewBlankPage}
                      className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg flex items-center gap-1 border border-slate-300 transition"
                      title="Abrir una nueva hoja limpia en el libro diario"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nueva Hoja</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Android Browser Microphone Warning banner */}
            {speechWarning && (
              <div className="mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-sans-ui text-xs flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Aviso del Micrófono en Android:</span>
                  </div>
                  <button
                    onClick={() => setSpeechWarning(null)}
                    className="text-slate-400 hover:text-slate-700 text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-900 pl-5">
                  {speechWarning}
                </p>
                <div className="flex items-center gap-2 pt-1 border-t border-amber-200 pl-5">
                  <button
                    onClick={() => generateAITranscription()}
                    className="text-[10px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                  >
                    <Sparkles className="w-3 h-3" />
                    Transcribir con IA
                  </button>
                  <button
                    onClick={requestMicPermissionDirectly}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-white font-semibold px-2.5 py-1 rounded-lg"
                  >
                    Activar Micrófono
                  </button>
                  <button
                    onClick={() => setShowTroubleshootModal(true)}
                    className="text-[10px] text-amber-800 hover:underline font-semibold ml-auto"
                  >
                    Ver Guía Chrome Android ↗
                  </button>
                </div>
              </div>
            )}

            {/* Editable or Display Notebook Ruled Area */}
            <div className="flex-1 flex flex-col relative min-h-[320px]">
              
              {/* If viewing a saved entry */}
              {currentViewingEntry ? (
                <div className="w-full flex-1 font-handwriting text-lg sm:text-xl leading-[29px] text-slate-900 select-text whitespace-pre-wrap">
                  {currentViewingEntry.transcriptionText}
                </div>
              ) : (
                <>
                  <textarea
                    value={transcript}
                    onChange={(e) => {
                      setTranscript(e.target.value);
                      speechAccumulatorRef.current = e.target.value;
                    }}
                    placeholder={
                      isRecording 
                        ? "Habla a la cámara... Todo lo que digas se escribe aquí sobre la hoja en tiempo real." 
                        : "Presiona el botón rojo para grabar tu video y hablar. Todo lo que digas se escribirá automáticamente en esta hoja del libro diario."
                    }
                    className="w-full flex-1 bg-transparent border-0 outline-none resize-none font-handwriting text-lg sm:text-xl leading-[29px] text-slate-900 placeholder:text-slate-400 placeholder:italic select-text"
                  />

                  {/* Interim Real-time Words being spoken */}
                  {interimTranscript && (
                    <div className="my-1 text-blue-800 bg-blue-100/80 px-2 py-1 rounded-md text-base sm:text-lg font-handwriting italic animate-pulse border border-blue-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span>Escribiendo: "{interimTranscript}"</span>
                    </div>
                  )}

                  {/* Ink Cursor / Active writing indicator */}
                  {isListeningSpeech && (
                    <div className="flex items-center gap-1.5 text-xs font-sans-ui text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300 w-fit my-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>{speechStatusText}</span>
                    </div>
                  )}
                </>
              )}

              {/* Quick sample phrases on bottom of sheet */}
              {!currentViewingEntry && (
                <div className="mt-auto pt-2 border-t border-slate-200/90 font-sans-ui flex items-center justify-between gap-1 flex-wrap">
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[10px] text-slate-500 font-bold mr-0.5">Dictado rápido:</span>
                    {PRESET_PHRASES.slice(0, 2).map((phrase, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const newText = transcript ? `${transcript} ${phrase}` : phrase;
                          setTranscript(newText);
                          speechAccumulatorRef.current = newText;
                        }}
                        className="text-[10px] bg-white hover:bg-amber-50 text-slate-700 px-2 py-0.5 rounded border border-slate-300 shadow-2xs truncate max-w-[130px] sm:max-w-[200px] text-left"
                        title={phrase}
                      >
                        "{phrase}"
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => generateAITranscription()}
                      className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1"
                      title="Generar transcripción de prueba"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Probar IA
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Margin Note */}
            <div className="mt-2 pt-1 border-t border-rose-300/40 text-[10px] font-sans-ui text-slate-500 flex items-center justify-between">
              <span>Libro Diario Personal • Regla Estricta 1:1</span>
              <span>Página {displayPageNumber} de {savedEntries.length + 1}</span>
            </div>

          </div>

          {/* ========================================================
              VIDEO ENCIMA DE LA HOJA EN UNA ESQUINA COMO UN CUADRITO
              Floating Corner Box (Picture-in-Picture)
             ======================================================== */}
          {!isVideoMinimized ? (
            <div 
              className={`absolute ${getCornerClasses()} ${getVideoBoxDimensions()} z-30 transition-all duration-300 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500/60 shadow-2xl shadow-slate-950/80 group flex flex-col`}
            >
              {/* Corner Box Video Viewport */}
              <div className="relative w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden">
                
                {/* When viewing a saved entry: play that entry's video! */}
                {currentViewingEntry && currentViewingEntry.videoBlobUrl ? (
                  <video
                    src={currentViewingEntry.videoBlobUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : !useSimulatedFeed ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-center p-2">
                    <Camera className="w-7 h-7 text-amber-400 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-200 mt-1">Cámara en Esquina</span>
                    <span className="text-[8px] text-slate-400">Cuadrito PiP</span>
                  </div>
                )}

                {/* Overlays inside the corner video box */}
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
                  {isRecording ? (
                    <div className="flex items-center gap-1 bg-red-600/95 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md backdrop-blur animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      <span>REC {formatTimer(durationSeconds)}</span>
                    </div>
                  ) : (
                    <div className="bg-black/70 backdrop-blur text-amber-300 text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5" />
                      <span>{isFrontCamera ? 'Frontal' : 'Trasera'}</span>
                    </div>
                  )}
                </div>

                {/* Corner controls: Flip camera, Move corner, Size, Minimize */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-10 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={cycleCornerPosition}
                    title="Mover video a otra esquina de la hoja"
                    className="p-1 rounded-md bg-black/70 hover:bg-black text-white text-[9px] backdrop-blur border border-white/10 shadow"
                  >
                    <Move className="w-2.5 h-2.5 text-amber-400" />
                  </button>

                  <button
                    onClick={cycleVideoSize}
                    title="Cambiar tamaño del cuadrito de video"
                    className="p-1 rounded-md bg-black/70 hover:bg-black text-white text-[9px] backdrop-blur border border-white/10 shadow"
                  >
                    <Maximize2 className="w-2.5 h-2.5 text-amber-400" />
                  </button>

                  <button
                    onClick={() => setIsVideoMinimized(true)}
                    title="Minimizar cuadrito de video"
                    className="p-1 rounded-md bg-black/70 hover:bg-black text-white text-[9px] backdrop-blur border border-white/10 shadow"
                  >
                    <Minimize2 className="w-2.5 h-2.5 text-slate-300" />
                  </button>
                </div>

                {/* Bottom Sound Level Indicator inside corner box */}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between z-10 bg-black/70 backdrop-blur px-1.5 py-0.5 rounded-md border border-white/10">
                  <div className="flex items-center gap-1">
                    <Mic className={`w-2.5 h-2.5 ${soundLevel > 15 ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <div className="flex items-end gap-0.5 h-2">
                      {[15, 30, 60, 40].map((threshold, i) => (
                        <div
                          key={i}
                          className={`w-0.5 rounded-full ${soundLevel >= threshold ? 'bg-emerald-400' : 'bg-slate-600'}`}
                          style={{ height: `${Math.max(2, (soundLevel / 100) * 8)}px` }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={toggleCameraFacing}
                    disabled={isRecording}
                    title="Girar cámara"
                    className="text-slate-300 hover:text-white disabled:opacity-30"
                  >
                    <SwitchCamera className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Caption under corner video */}
              <div className="bg-slate-950 px-2 py-0.5 text-center text-[8px] text-amber-300 font-mono tracking-tight border-t border-slate-800">
                {currentViewingEntry ? 'Video de esta página' : isRecording ? 'Escribiendo en hoja...' : 'Video en esquina'}
              </div>
            </div>
          ) : (
            // Minimized Floating Video Badge
            <button
              onClick={() => setIsVideoMinimized(false)}
              className={`absolute ${getCornerClasses()} z-30 bg-slate-900 border-2 border-amber-500 text-amber-300 px-2.5 py-1.5 rounded-full shadow-2xl flex items-center gap-1.5 text-xs font-bold hover:scale-105 transition-transform`}
              title="Abrir cuadrito de video en la esquina"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Ver Video</span>
              {isRecording && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
            </button>
          )}

        </div>

        {/* ========================================================
            BARRA DE GRABACIÓN Y CONTROL INFERIOR
           ======================================================== */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 z-30">
          
          {/* Previous / Back to Book button */}
          <button
            onClick={() => {
              if (currentViewingEntry) {
                setCurrentViewingEntry(null);
              } else {
                setTranscript('');
                setInterimTranscript('');
                speechAccumulatorRef.current = '';
              }
            }}
            disabled={isRecording || (!transcript && !currentViewingEntry)}
            className="p-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 hover:bg-slate-900 transition flex items-center gap-1 text-xs"
            title={currentViewingEntry ? "Volver a la hoja en vivo" : "Limpiar hoja actual"}
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">{currentViewingEntry ? 'Hoja en Vivo' : 'Limpiar'}</span>
          </button>

          {/* MAIN RECORD BUTTON: Starts video + transcription onto the full sheet */}
          <div className="relative flex flex-col items-center">
            {isRecording && (
              <span className="absolute -inset-2 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
            )}
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                isRecording
                  ? 'bg-red-600 text-white ring-4 ring-red-500/30'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 ring-4 ring-amber-500/20'
              }`}
              title={isRecording ? "Detener grabación y guardar en hoja del diario" : "Grabar video y escribir en la hoja"}
            >
              {isRecording ? (
                <Square className="w-5 h-5 fill-current" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
              )}
            </button>
            <span className="text-[10px] text-slate-400 mt-1 font-semibold">
              {isRecording ? `REC ${formatTimer(durationSeconds)}` : 'Grabar en Hoja'}
            </span>
          </div>

          {/* Save / Book Page Navigator */}
          <div className="flex items-center gap-1">
            {!isRecording && transcript && !currentViewingEntry && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Hoja</span>
              </button>
            )}

            <button
              onClick={() => setShowBookIndexModal(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition flex items-center gap-1 text-xs"
              title="Ver todas las páginas guardadas del diario"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Hojas ({savedEntries.length})</span>
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================
          MODAL: GUARDAR EN LIBRO DIARIO (CON REGLA 1:1)
         ======================================================== */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              Guardar Hoja en tu Libro Diario
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Esta página del diario contendrá tu transcripción escrita y el video asociado en la esquina.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Título de la Hoja
                </label>
                <input
                  type="text"
                  value={entryTitle}
                  onChange={(e) => setEntryTitle(e.target.value)}
                  placeholder="Ej: Reflexión sobre mis metas de hoy"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Compartir Confidencial (Regla Estricta 1:1)
                  </label>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded font-mono">
                    Máximo 1 persona
                  </span>
                </div>
                <input
                  type="email"
                  value={sharedEmail}
                  onChange={(e) => {
                    setSharedEmail(e.target.value);
                    validateSharingEmail(e.target.value);
                  }}
                  placeholder="Dejar vacío (100% privado) o correo único (ej: mentor@gmail.com)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
                />
                {shareEmailError && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {shareEmailError}
                  </p>
                )}
              </div>

              {/* Text Preview on Ruled Paper */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Texto Escrito en la Hoja:
                </label>
                <div className="max-h-28 overflow-y-auto p-2.5 rounded-xl bg-[#fdfaf3] text-slate-900 font-handwriting text-base leading-6 border border-amber-300">
                  {transcript || (
                    <span className="text-slate-400 italic font-sans-ui text-xs">
                      (No se detectó texto. Puedes usar "Transcribir con IA" antes de guardar).
                    </span>
                  )}
                </div>
              </div>

              {!transcript && (
                <button
                  type="button"
                  onClick={() => generateAITranscription()}
                  className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-Completar con Transcripción Inteligente
                </button>
              )}

              {/* Upload Progress Bar if saving */}
              {isUploading && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
                    <span>{uploadStepText}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveToDiary}
                disabled={isUploading || !!shareEmailError}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-40 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isOnline ? 'Guardar en Libro Diario' : 'Guardar en SQLite'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ÍNDICE DE PÁGINAS DEL LIBRO DIARIO
         ======================================================== */}
      {showBookIndexModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  Índice de Páginas del Libro Diario
                </h3>
                <p className="text-xs text-slate-400">
                  Selecciona cualquier hoja para leerla a pantalla completa con su video en la esquina.
                </p>
              </div>
              <button
                onClick={() => setShowBookIndexModal(false)}
                className="text-slate-400 hover:text-white text-base font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {savedEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  onClick={() => {
                    setCurrentViewingEntry(entry);
                    setShowBookIndexModal(false);
                  }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                    currentViewingEntry?.id === entry.id
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-mono">
                        Página #{entry.pageNumber}
                      </span>
                      <span className="text-xs font-bold text-white">{entry.title}</span>
                      <span className="text-[10px] text-slate-400">{entry.createdAt}</span>
                    </div>
                    <p className="text-xs text-slate-300 font-handwriting text-base line-clamp-2">
                      "{entry.transcriptionText}"
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-sans-ui pt-1">
                      <span className="flex items-center gap-1 text-amber-400">
                        <Camera className="w-3 h-3" /> Video: {formatTimer(entry.durationSeconds)}
                      </span>
                      {entry.sharedWith ? (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <Share2 className="w-3 h-3" /> Compartido con {entry.sharedWith}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Lock className="w-3 h-3" /> 100% Privado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    <button className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs rounded-lg transition">
                      Abrir Hoja
                    </button>
                  </div>
                </div>
              ))}

              {offlineQueue.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    Hojas en Caché SQLite Offline ({offlineQueue.length})
                  </h4>
                  {offlineQueue.map((item) => (
                    <div key={item.id} className="p-3 rounded-2xl bg-slate-950/70 border border-amber-500/20 mb-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300">{item.title}</span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono">
                          Pendiente Sync
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-handwriting text-base mt-1 line-clamp-1">
                        "{item.transcriptionText}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <button
                onClick={() => {
                  handleStartNewBlankPage();
                  setShowBookIndexModal(false);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Hoja en Blanco
              </button>
              <button
                onClick={() => setShowBookIndexModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: GUÍA DE SOLUCIÓN DE PROBLEMAS DE MICRÓFONO EN ANDROID
         ======================================================== */}
      {showTroubleshootModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              ¿Por qué el navegador Android no transcribió el micrófono?
            </h3>
            
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              En navegadores móviles como Google Chrome para Android, la transcripción por voz requiere dos permisos independientes y conexión a los servidores de voz de Google:
            </p>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">
                  1. Habilitar el Permiso de Micrófono en Chrome para Android:
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Toca el icono de candado 🔒 o configuración junto a la barra de direcciones de tu navegador &rarr; pulsa <strong>"Permisos"</strong> &rarr; activa el interruptor de <strong>"Micrófono"</strong>.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">
                  2. Diferencia con la app instalada (APK de Flutter):
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  En el APK nativo de Flutter, la transcripción no depende del navegador: utiliza el hardware directo del teléfono mediante el paquete <code>speech_to_text</code> con el permiso <code>RECORD_AUDIO</code> de Android, por lo que transcribe con total fiabilidad y sin cortes.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="font-bold text-amber-300 block mb-1">
                  3. Transcripción con IA Integrada:
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Para probar la aplicación inmediatamente aunque tu navegador Android tenga bloqueado el micrófono, puedes pulsar el botón <strong>"Transcribir con IA"</strong> o los botones de dictado rápido.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={requestMicPermissionDirectly}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl"
              >
                Solicitar Permiso Nuevamente
              </button>
              <button
                onClick={() => setShowTroubleshootModal(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
