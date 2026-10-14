export interface CodeFile {
  id: string;
  filename: string;
  path: string;
  category: 'controller' | 'service' | 'ui' | 'model' | 'rules' | 'config' | 'architecture';
  description: string;
  language: string;
  code: string;
}

export const FLUTTER_CODE_FILES: CodeFile[] = [
  {
    id: 'offline_cache_service',
    filename: 'offline_cache_service.dart',
    path: 'lib/data/services/offline_cache_service.dart',
    category: 'service',
    description: 'Almacenamiento temporal SQLite (sqflite) para guardar transcripciones, metadatos y rutas de video sin conexión.',
    language: 'dart',
    code: `import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import '../models/diary_entry_model.dart';

final offlineCacheServiceProvider = Provider<OfflineCacheService>((ref) {
  return OfflineCacheService();
});

/// Estados de sincronización en la cola offline
enum SyncStatus {
  pending,  // Guardado local, esperando conexión
  syncing,  // En proceso de subida activa
  synced,   // Subido a Drive y Firestore exitosamente
  failed,   // Falló tras varios reintentos
}

/// Servicio de almacenamiento local en base de datos SQLite para resiliencia offline.
/// Almacena transcripciones, metadatos y persistencia de video mientras el usuario está desconectado.
class OfflineCacheService {
  static const String _dbName = 'multimedia_diary_offline.db';
  static const int _dbVersion = 1;
  static const String tableName = 'offline_diary_queue';

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDatabase();
    return _db!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = p.join(dbPath, _dbName);

    return await openDatabase(
      path,
      version: _dbVersion,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE \$tableName (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            transcription_text TEXT NOT NULL,
            local_video_path TEXT NOT NULL,
            drive_video_id TEXT,
            shared_with TEXT,
            created_at INTEGER NOT NULL,
            duration_seconds INTEGER NOT NULL,
            sync_status TEXT NOT NULL,
            sync_attempts INTEGER NOT NULL DEFAULT 0,
            last_sync_error TEXT
          )
        ''');
      },
    );
  }

  /// Guarda una entrada completa en la cola local cuando no hay conexión a internet
  Future<void> saveToOfflineQueue({
    required DiaryEntry entry,
    required String localVideoPath,
  }) async {
    final db = await database;

    await db.insert(
      tableName,
      {
        'id': entry.id.isEmpty ? 'offline_\${DateTime.now().millisecondsSinceEpoch}' : entry.id,
        'user_id': entry.userId,
        'transcription_text': entry.transcriptionText,
        'local_video_path': localVideoPath,
        'drive_video_id': entry.driveVideoId,
        'shared_with': entry.sharedWith?.trim().toLowerCase(),
        'created_at': entry.createdAt.millisecondsSinceEpoch,
        'duration_seconds': entry.durationSeconds,
        'sync_status': SyncStatus.pending.name,
        'sync_attempts': 0,
        'last_sync_error': null,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );

    debugPrint('Entrada guardada en caché local SQLite: \${entry.id}');
  }

  /// Recupera todas las entradas pendientes de sincronizar
  Future<List<Map<String, dynamic>>> getPendingEntries() async {
    final db = await database;
    return await db.query(
      tableName,
      where: 'sync_status = ? OR sync_status = ?',
      whereArgs: [SyncStatus.pending.name, SyncStatus.failed.name],
      orderBy: 'created_at ASC', // FIFO: sincronizar las más antiguas primero
    );
  }

  /// Actualiza el estado a syncing para evitar carreras entre workers
  Future<void> markAsSyncing(String id) async {
    final db = await database;
    await db.update(
      tableName,
      {'sync_status': SyncStatus.syncing.name},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Marca la entrada como sincronizada exitosamente con su ID definitivo de Drive
  Future<void> markAsSynced({
    required String localId,
    required String driveVideoId,
  }) async {
    final db = await database;
    await db.update(
      tableName,
      {
        'sync_status': SyncStatus.synced.name,
        'drive_video_id': driveVideoId,
        'last_sync_error': null,
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }

  /// Registra un fallo de sincronización e incrementa el contador de reintentos
  Future<void> markSyncFailed({
    required String localId,
    required String errorMessage,
  }) async {
    final db = await database;
    await db.rawUpdate('''
      UPDATE \$tableName 
      SET sync_status = ?, 
          sync_attempts = sync_attempts + 1, 
          last_sync_error = ? 
      WHERE id = ?
    ''', [SyncStatus.failed.name, errorMessage, localId]);
  }

  /// Devuelve el total de entradas que aún esperan sincronización
  Future<int> countPendingSync() async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM \$tableName WHERE sync_status != ?',
      [SyncStatus.synced.name],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }
}
`,
  },
  {
    id: 'sync_coordinator',
    filename: 'sync_coordinator.dart',
    path: 'lib/data/services/sync_coordinator.dart',
    category: 'service',
    description: 'Coordinador automático de sincronización reactivo a connectivity_plus. Sube videos a Drive y persiste metadatos a Firestore al recuperar red.',
    language: 'dart',
    code: `import 'dart:async';
import 'dart:io';
import 'package:camera/camera.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/diary_entry_model.dart';
import 'firestore_service.dart';
import 'google_drive_service.dart';
import 'offline_cache_service.dart';

final syncCoordinatorProvider = Provider<SyncCoordinator>((ref) {
  final coordinator = SyncCoordinator(
    cacheService: ref.watch(offlineCacheServiceProvider),
    driveService: ref.watch(googleDriveServiceProvider),
    firestoreService: ref.watch(firestoreServiceProvider),
  );
  ref.onDispose(() => coordinator.dispose());
  return coordinator;
});

/// Estado global de sincronización para la UI
class SyncProgressState {
  final bool isOnline;
  final bool isSyncing;
  final int pendingCount;
  final String? currentOperation;

  const SyncProgressState({
    required this.isOnline,
    required this.isSyncing,
    required this.pendingCount,
    this.currentOperation,
  });
}

/// Coordinador que escucha eventos de conectividad de red y orquesta la sincronización automática
class SyncCoordinator {
  final OfflineCacheService _cacheService;
  final GoogleDriveService _driveService;
  final FirestoreService _firestoreService;

  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _isSyncing = false;

  final _syncStateController = StreamController<SyncProgressState>.broadcast();
  Stream<SyncProgressState> get syncStateStream => _syncStateController.stream;

  SyncCoordinator({
    required OfflineCacheService cacheService,
    required GoogleDriveService driveService,
    required FirestoreService firestoreService,
  })  : _cacheService = cacheService,
        _driveService = driveService,
        _firestoreService = firestoreService {
    _startMonitoring();
  }

  void _startMonitoring() {
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((results) async {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      debugPrint('Cambio de conectividad detectado: Online=\$isOnline');

      if (isOnline) {
        // Red recuperada: disparar sincronización en segundo plano de la cola
        await processSyncQueue();
      } else {
        _notifyState(isOnline: false, isSyncing: false);
      }
    });

    // Comprobación inicial de cola al arrancar la app
    processSyncQueue();
  }

  /// Procesa secuencialmente todos los elementos pendientes en la base local SQLite
  Future<void> processSyncQueue() async {
    if (_isSyncing) return; // Evitar ejecuciones simultáneas

    final pendingList = await _cacheService.getPendingEntries();
    if (pendingList.isEmpty) {
      _notifyState(isOnline: true, isSyncing: false, pendingCount: 0);
      return;
    }

    _isSyncing = true;
    _notifyState(
      isOnline: true,
      isSyncing: true,
      pendingCount: pendingList.length,
      operation: 'Sincronizando \${pendingList.length} entradas pendientes...',
    );

    for (final raw in pendingList) {
      final localId = raw['id'] as String;
      final userId = raw['user_id'] as String;
      final text = raw['transcription_text'] as String;
      final videoPath = raw['local_video_path'] as String;
      final sharedWith = raw['shared_with'] as String?;
      final createdAtMs = raw['created_at'] as int;
      final duration = raw['duration_seconds'] as int;
      String? driveVideoId = raw['drive_video_id'] as String?;

      try {
        await _cacheService.markAsSyncing(localId);

        // PASO 1: Subir archivo de video a Google Drive si aún no se subió
        if (driveVideoId == null || driveVideoId.isEmpty) {
          final videoFile = File(videoPath);
          if (!await videoFile.exists()) {
            throw Exception('El archivo de video local no existe en la ruta: \$videoPath');
          }

          driveVideoId = await _driveService.uploadVideo(
            videoFile: XFile(videoPath),
            sharedWithEmail: sharedWith,
          );

          if (driveVideoId == null) {
            throw Exception('Fallo al obtener ID de Google Drive.');
          }
        }

        // PASO 2: Persistir en Cloud Firestore con la regla de privacidad estricta 1:1
        final entry = DiaryEntry(
          id: '',
          userId: userId,
          transcriptionText: text,
          driveVideoId: driveVideoId,
          sharedWith: sharedWith,
          createdAt: DateTime.fromMillisecondsSinceEpoch(createdAtMs),
          durationSeconds: duration,
        );

        await _firestoreService.createEntry(entry);

        // PASO 3: Marcar en base de datos local SQLite como sincronizado
        await _cacheService.markAsSynced(
          localId: localId,
          driveVideoId: driveVideoId,
        );

        debugPrint('Entrada \$localId sincronizada con éxito en la nube.');
      } catch (e) {
        debugPrint('Error sincronizando entrada \$localId: \$e');
        await _cacheService.markSyncFailed(
          localId: localId,
          errorMessage: e.toString(),
        );
      }
    }

    _isSyncing = false;
    final remaining = await _cacheService.countPendingSync();
    _notifyState(
      isOnline: true,
      isSyncing: false,
      pendingCount: remaining,
      operation: remaining == 0 ? 'Todas las entradas sincronizadas.' : null,
    );
  }

  void _notifyState({
    required bool isOnline,
    required bool isSyncing,
    int? pendingCount,
    String? operation,
  }) async {
    final count = pendingCount ?? await _cacheService.countPendingSync();
    _syncStateController.add(
      SyncProgressState(
        isOnline: isOnline,
        isSyncing: isSyncing,
        pendingCount: count,
        currentOperation: operation,
      ),
    );
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _syncStateController.close();
  }
}
`,
  },
  {
    id: 'diary_writing_service',
    filename: 'diary_writing_service.dart',
    path: 'lib/data/services/diary_writing_service.dart',
    category: 'service',
    description: 'Servicio de escritura y dictado por voz integrado con speech_to_text. Transcribe en tiempo real a la hoja del diario y actualiza continuamente el estado de la entrada actual.',
    language: 'dart',
    code: `import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../models/diary_entry_model.dart';

/// Estado actual del servicio de escritura por voz y borrador de entrada
class DiaryWritingState {
  final bool isInitialized;
  final bool isListening;
  final String committedText;
  final String interimWords;
  final double soundLevel;
  final String? errorMessage;
  final String currentLocaleId;
  final DiaryEntry currentEntry;

  const DiaryWritingState({
    this.isInitialized = false,
    this.isListening = false,
    this.committedText = '',
    this.interimWords = '',
    this.soundLevel = 0.0,
    this.errorMessage,
    this.currentLocaleId = 'es_ES',
    required this.currentEntry,
  });

  /// Texto completo visible en la hoja del diario (texto fijado + palabras en curso)
  String get fullDisplayText {
    if (interimWords.trim().isEmpty) return committedText;
    if (committedText.trim().isEmpty) return interimWords;
    return '\$committedText \$interimWords';
  }

  DiaryWritingState copyWith({
    bool? isInitialized,
    bool? isListening,
    String? committedText,
    String? interimWords,
    double? soundLevel,
    String? errorMessage,
    String? currentLocaleId,
    DiaryEntry? currentEntry,
  }) {
    return DiaryWritingState(
      isInitialized: isInitialized ?? this.isInitialized,
      isListening: isListening ?? this.isListening,
      committedText: committedText ?? this.committedText,
      interimWords: interimWords ?? this.interimWords,
      soundLevel: soundLevel ?? this.soundLevel,
      errorMessage: errorMessage,
      currentLocaleId: currentLocaleId ?? this.currentLocaleId,
      currentEntry: currentEntry ?? this.currentEntry,
    );
  }

  factory DiaryWritingState.initial({String userId = 'local_user'}) {
    return DiaryWritingState(
      currentEntry: DiaryEntry(
        id: '',
        userId: userId,
        transcriptionText: '',
        driveVideoId: '',
        createdAt: DateTime.now(),
        durationSeconds: 0,
      ),
    );
  }
}

/// Provider de Riverpod para inyectar el servicio de escritura del diario
final diaryWritingServiceProvider =
    StateNotifierProvider<DiaryWritingService, DiaryWritingState>((ref) {
  return DiaryWritingService();
});

/// Servicio de escritura del diario impulsado por 'speech_to_text'
/// Transcribe en tiempo real la voz a texto y actualiza continuamente el estado
/// de la entrada actual del diario.
class DiaryWritingService extends StateNotifier<DiaryWritingState> {
  final SpeechToText _speechToText = SpeechToText();
  bool _shouldKeepListening = false;

  DiaryWritingService() : super(DiaryWritingState.initial());

  /// Inicializa el motor SpeechToText y verifica disponibilidad en el sistema
  Future<bool> initializeEngine({String? preferredLocale}) async {
    try {
      final bool available = await _speechToText.initialize(
        onError: _onSpeechError,
        onStatus: _onSpeechStatus,
        debugLogging: kDebugMode,
      );

      String selectedLocale = preferredLocale ?? 'es_ES';
      if (available) {
        final locales = await _speechToText.locales();
        final hasSpanish = locales.any((l) => l.localeId.startsWith('es'));
        if (!hasSpanish && locales.isNotEmpty) {
          selectedLocale = locales.first.localeId;
        }
      }

      state = state.copyWith(
        isInitialized: available,
        currentLocaleId: selectedLocale,
        errorMessage: available ? null : 'Reconocimiento de voz no disponible en este dispositivo.',
      );

      return available;
    } catch (e) {
      state = state.copyWith(
        isInitialized: false,
        errorMessage: 'Error al inicializar SpeechToText: \$e',
      );
      return false;
    }
  }

  /// Inicia la escucha continua para transcribir la voz a la hoja del diario
  Future<void> startVoiceTranscription() async {
    if (!state.isInitialized) {
      final ready = await initializeEngine();
      if (!ready) return;
    }

    _shouldKeepListening = true;

    try {
      state = state.copyWith(
        isListening: true,
        interimWords: '',
        errorMessage: null,
      );

      await _startListeningSession();
    } catch (e) {
      state = state.copyWith(
        isListening: false,
        errorMessage: 'Error al iniciar transcripción: \$e',
      );
    }
  }

  /// Sesión interna de escucha con configuración de dictado y nivel de sonido
  Future<void> _startListeningSession() async {
    if (!_shouldKeepListening) return;

    await _speechToText.listen(
      onResult: _handleSpeechResult,
      listenFor: const Duration(minutes: 10),
      pauseFor: const Duration(seconds: 4),
      partialResults: true,
      localeId: state.currentLocaleId,
      cancelOnError: false,
      listenMode: ListenMode.dictation,
      onSoundLevelChange: (level) {
        state = state.copyWith(soundLevel: level);
      },
    );
  }

  /// Procesa los fragmentos reconocidos (parciales y finales) y actualiza el estado de la entrada
  void _handleSpeechResult(SpeechRecognitionResult result) {
    if (result.finalResult) {
      // Frase finalizada por el reconocedor: se consolida en el texto permanente
      final String recognized = result.recognizedWords.trim();
      if (recognized.isNotEmpty) {
        final String newCommitted = state.committedText.isEmpty
            ? recognized
            : '\${state.committedText} \$recognized';

        // Actualizamos tanto el texto fijado como la entrada actual del diario
        final updatedEntry = state.currentEntry.copyWith(
          transcriptionText: newCommitted,
        );

        state = state.copyWith(
          committedText: newCommitted,
          interimWords: '',
          currentEntry: updatedEntry,
        );
      }
    } else {
      // Palabras intermedias en tiempo real (mientras el usuario sigue hablando)
      state = state.copyWith(
        interimWords: result.recognizedWords,
      );
    }
  }

  /// Detiene la transcripción y consolida todo el texto pendiente en la entrada actual
  Future<void> stopVoiceTranscription() async {
    _shouldKeepListening = false;

    if (_speechToText.isListening) {
      await _speechToText.stop();
    }

    // Consolidar palabras intermedias pendientes si quedaron flotando
    final String fullText = state.fullDisplayText.trim();
    final updatedEntry = state.currentEntry.copyWith(
      transcriptionText: fullText,
    );

    state = state.copyWith(
      isListening: false,
      committedText: fullText,
      interimWords: '',
      soundLevel: 0.0,
      currentEntry: updatedEntry,
    );
  }

  /// Permite la edición manual o corrección directa sobre la hoja del diario
  void updateManualText(String newText) {
    final updatedEntry = state.currentEntry.copyWith(
      transcriptionText: newText,
    );
    state = state.copyWith(
      committedText: newText,
      interimWords: '',
      currentEntry: updatedEntry,
    );
  }

  /// Prepara una nueva hoja en blanco para el diario
  void resetNewSheet({String? userId}) {
    state = DiaryWritingState.initial(userId: userId ?? state.currentEntry.userId).copyWith(
      isInitialized: state.isInitialized,
      currentLocaleId: state.currentLocaleId,
    );
  }

  /// Callback cuando el status del motor de voz cambia
  void _onSpeechStatus(String status) {
    debugPrint('[SpeechToText] Estado: \$status');
    if (status == 'done' && _shouldKeepListening) {
      // Reactiva la escucha continua si el usuario no ha pulsado detener
      Future.delayed(const Duration(milliseconds: 200), () {
        if (_shouldKeepListening && !_speechToText.isListening) {
          _startListeningSession();
        }
      });
    } else if (status == 'notListening' && !_shouldKeepListening) {
      state = state.copyWith(isListening: false, soundLevel: 0.0);
    }
  }

  /// Callback de errores del motor de voz
  void _onSpeechError(SpeechRecognitionError error) {
    debugPrint('[SpeechToText] Error: \${error.errorMsg} (permanente: \${error.permanent})');
    if (error.permanent) {
      state = state.copyWith(
        isListening: false,
        soundLevel: 0.0,
        errorMessage: 'Error de reconocimiento: \${error.errorMsg}',
      );
    }
  }

  @override
  void dispose() {
    _shouldKeepListening = false;
    _speechToText.stop();
    super.dispose();
  }
}
`,
  },
  {
    id: 'diary_controller',
    filename: 'diary_controller.dart',
    path: 'lib/presentation/controllers/diary_controller.dart',
    category: 'controller',
    description: 'Controlador sincronizado con resiliencia offline. Si no hay conexión o falla la red, guarda en SQLite y delega auto-sync.',
    language: 'dart',
    code: `import 'dart:async';
import 'package:camera/camera.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';

import '../../data/models/diary_entry_model.dart';
import '../../data/services/firestore_service.dart';
import '../../data/services/google_drive_service.dart';
import '../../data/services/offline_cache_service.dart';
import '../../data/services/sync_coordinator.dart';

enum RecordingStatus {
  uninitialized,
  ready,
  recording,
  processing,
  uploading,
  savedOffline, // Guardado en caché temporal sin conexión
  saved,        // Guardado directamente en la nube
  error,
}

@immutable
class DiaryState {
  final RecordingStatus status;
  final CameraController? cameraController;
  final bool isCameraInitialized;
  final bool isFrontCamera;
  final String transcriptionText;
  final String currentWords;
  final double soundLevel;
  final int recordingDurationSeconds;
  final double uploadProgress;
  final String? driveFileId;
  final String? errorMessage;
  final XFile? recordedVideoFile;
  final bool isOfflineSaved;

  const DiaryState({
    this.status = RecordingStatus.uninitialized,
    this.cameraController,
    this.isCameraInitialized = false,
    this.isFrontCamera = true,
    this.transcriptionText = '',
    this.currentWords = '',
    this.soundLevel = 0.0,
    this.recordingDurationSeconds = 0,
    this.uploadProgress = 0.0,
    this.driveFileId,
    this.errorMessage,
    this.recordedVideoFile,
    this.isOfflineSaved = false,
  });

  DiaryState copyWith({
    RecordingStatus? status,
    CameraController? cameraController,
    bool? isCameraInitialized,
    bool? isFrontCamera,
    String? transcriptionText,
    String? currentWords,
    double? soundLevel,
    int? recordingDurationSeconds,
    double? uploadProgress,
    String? driveFileId,
    String? errorMessage,
    XFile? recordedVideoFile,
    bool? isOfflineSaved,
  }) {
    return DiaryState(
      status: status ?? this.status,
      cameraController: cameraController ?? this.cameraController,
      isCameraInitialized: isCameraInitialized ?? this.isCameraInitialized,
      isFrontCamera: isFrontCamera ?? this.isFrontCamera,
      transcriptionText: transcriptionText ?? this.transcriptionText,
      currentWords: currentWords ?? this.currentWords,
      soundLevel: soundLevel ?? this.soundLevel,
      recordingDurationSeconds: recordingDurationSeconds ?? this.recordingDurationSeconds,
      uploadProgress: uploadProgress ?? this.uploadProgress,
      driveFileId: driveFileId ?? this.driveFileId,
      errorMessage: errorMessage,
      recordedVideoFile: recordedVideoFile ?? this.recordedVideoFile,
      isOfflineSaved: isOfflineSaved ?? this.isOfflineSaved,
    );
  }
}

final diaryControllerProvider =
    StateNotifierProvider.autoDispose<DiaryController, DiaryState>((ref) {
  return DiaryController(
    driveService: ref.watch(googleDriveServiceProvider),
    firestoreService: ref.watch(firestoreServiceProvider),
    cacheService: ref.watch(offlineCacheServiceProvider),
    syncCoordinator: ref.watch(syncCoordinatorProvider),
  );
});

class DiaryController extends StateNotifier<DiaryState> {
  final GoogleDriveService _driveService;
  final FirestoreService _firestoreService;
  final OfflineCacheService _cacheService;
  final SyncCoordinator _syncCoordinator;

  final SpeechToText _speechToText = SpeechToText();
  List<CameraDescription> _availableCameras = [];
  Timer? _recordingTimer;

  DiaryController({
    required GoogleDriveService driveService,
    required FirestoreService firestoreService,
    required OfflineCacheService cacheService,
    required SyncCoordinator syncCoordinator,
  })  : _driveService = driveService,
        _firestoreService = firestoreService,
        _cacheService = cacheService,
        _syncCoordinator = syncCoordinator,
        super(const DiaryState()) {
    initialize();
  }

  Future<void> initialize() async {
    try {
      state = state.copyWith(status: RecordingStatus.uninitialized);

      final bool speechAvailable = await _speechToText.initialize(
        onError: _handleSpeechError,
        onStatus: _handleSpeechStatus,
        debugLogging: kDebugMode,
      );

      if (!speechAvailable) {
        state = state.copyWith(
          status: RecordingStatus.error,
          errorMessage: 'El motor de reconocimiento de voz no está disponible.',
        );
        return;
      }

      _availableCameras = await availableCameras();
      if (_availableCameras.isEmpty) {
        state = state.copyWith(
          status: RecordingStatus.error,
          errorMessage: 'No se encontraron cámaras disponibles en el dispositivo.',
        );
        return;
      }

      final frontCamera = _availableCameras.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.front,
        orElse: () => _availableCameras.first,
      );

      await _setupCameraController(frontCamera);

      state = state.copyWith(
        status: RecordingStatus.ready,
        isFrontCamera: frontCamera.lensDirection == CameraLensDirection.front,
      );
    } catch (e) {
      state = state.copyWith(
        status: RecordingStatus.error,
        errorMessage: 'Error de inicialización: \${e.toString()}',
      );
    }
  }

  Future<void> _setupCameraController(CameraDescription camera) async {
    await state.cameraController?.dispose();

    final controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: true,
      imageFormatGroup: ImageFormatGroup.jpeg,
    );

    await controller.initialize();
    state = state.copyWith(
      cameraController: controller,
      isCameraInitialized: true,
    );
  }

  Future<void> startRecording() async {
    final cam = state.cameraController;
    if (cam == null || !cam.value.isInitialized) return;

    try {
      state = state.copyWith(
        status: RecordingStatus.recording,
        transcriptionText: '',
        currentWords: '',
        recordingDurationSeconds: 0,
        errorMessage: null,
        isOfflineSaved: false,
      );

      await cam.startVideoRecording();

      await _speechToText.listen(
        onResult: _handleSpeechResult,
        listenFor: const Duration(minutes: 10),
        pauseFor: const Duration(seconds: 4),
        partialResults: true,
        localeId: 'es_ES',
        cancelOnError: false,
        listenMode: ListenMode.dictation,
        onSoundLevelChange: (level) => state = state.copyWith(soundLevel: level),
      );

      _recordingTimer?.cancel();
      _recordingTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        state = state.copyWith(
          recordingDurationSeconds: state.recordingDurationSeconds + 1,
        );
      });
    } catch (e) {
      state = state.copyWith(
        status: RecordingStatus.error,
        errorMessage: 'Error al iniciar la grabación: \${e.toString()}',
      );
    }
  }

  Future<XFile?> stopRecording() async {
    _recordingTimer?.cancel();

    try {
      state = state.copyWith(status: RecordingStatus.processing);

      if (_speechToText.isListening) {
        await _speechToText.stop();
      }

      final finalText = ('\${state.transcriptionText} \${state.currentWords}').trim();
      state = state.copyWith(
        transcriptionText: finalText,
        currentWords: '',
        soundLevel: 0.0,
      );

      final cam = state.cameraController;
      if (cam != null && cam.value.isRecordingVideo) {
        final XFile video = await cam.stopVideoRecording();
        state = state.copyWith(
          recordedVideoFile: video,
          status: RecordingStatus.ready,
        );
        return video;
      }
      return null;
    } catch (e) {
      state = state.copyWith(
        status: RecordingStatus.error,
        errorMessage: 'Error al detener grabación: \${e.toString()}',
      );
      return null;
    }
  }

  /// LÓGICA DE ALMACENAMIENTO TEMPORAL (CACHÉ) & RESILIENCIA DE RED:
  /// Comprueba la conectividad. Si está desconectado o falla la red, guarda
  /// inmediatamente en SQLite local para sincronizarse en cuanto vuelva la red.
  Future<bool> saveAndUploadEntry({
    required String userId,
    String? sharedWithEmail,
  }) async {
    final video = state.recordedVideoFile;
    if (video == null) return false;

    // 1. Verificar conectividad previa
    final connectivityResults = await Connectivity().checkConnectivity();
    final bool isOffline = connectivityResults.every((r) => r == ConnectivityResult.none);

    final entry = DiaryEntry(
      id: '',
      userId: userId,
      transcriptionText: state.transcriptionText,
      driveVideoId: '',
      sharedWith: sharedWithEmail,
      createdAt: DateTime.now(),
      durationSeconds: state.recordingDurationSeconds,
    );

    if (isOffline) {
      // Guardar en almacenamiento temporal local SQLite
      await _cacheService.saveToOfflineQueue(
        entry: entry,
        localVideoPath: video.path,
      );

      state = state.copyWith(
        status: RecordingStatus.savedOffline,
        isOfflineSaved: true,
      );
      return true;
    }

    // 2. Si está online, intentar subida a Google Drive y Firestore
    try {
      state = state.copyWith(status: RecordingStatus.uploading, uploadProgress: 0.1);

      final driveFileId = await _driveService.uploadVideo(
        videoFile: video,
        sharedWithEmail: sharedWithEmail,
        onProgress: (p) => state = state.copyWith(uploadProgress: p),
      );

      if (driveFileId == null) throw Exception('Google Drive no devolvió ID.');

      final completeEntry = entry.copyWith(driveVideoId: driveFileId);
      await _firestoreService.createEntry(completeEntry);

      state = state.copyWith(
        status: RecordingStatus.saved,
        driveFileId: driveFileId,
        uploadProgress: 1.0,
      );
      return true;
    } catch (e) {
      debugPrint('Fallo al subir con red: \$e. Fallback a caché local SQLite.');
      
      // Fallback a almacenamiento temporal si falló por corte abrupto de red
      await _cacheService.saveToOfflineQueue(
        entry: entry,
        localVideoPath: video.path,
      );

      state = state.copyWith(
        status: RecordingStatus.savedOffline,
        isOfflineSaved: true,
        errorMessage: 'Sin conexión estable. Guardado localmente para auto-sincronización.',
      );
      return true;
    }
  }

  Future<void> switchCamera() async {
    if (_availableCameras.length < 2 || state.status == RecordingStatus.recording) return;
    final targetDirection = state.isFrontCamera ? CameraLensDirection.back : CameraLensDirection.front;
    final targetCamera = _availableCameras.firstWhere(
      (cam) => cam.lensDirection == targetDirection,
      orElse: () => _availableCameras.first,
    );
    await _setupCameraController(targetCamera);
    state = state.copyWith(isFrontCamera: targetCamera.lensDirection == CameraLensDirection.front);
  }

  void _handleSpeechResult(SpeechRecognitionResult result) {
    if (result.finalResult) {
      final updated = state.transcriptionText.isEmpty
          ? result.recognizedWords
          : '\${state.transcriptionText} \${result.recognizedWords}';
      state = state.copyWith(transcriptionText: updated, currentWords: '');
    } else {
      state = state.copyWith(currentWords: result.recognizedWords);
    }
  }

  void _handleSpeechError(SpeechRecognitionError error) => debugPrint('STT Error: \${error.errorMsg}');
  void _handleSpeechStatus(String status) => debugPrint('STT Status: \$status');

  @override
  void dispose() {
    _recordingTimer?.cancel();
    state.cameraController?.dispose();
    _speechToText.stop();
    super.dispose();
  }
}
`,
  },
  {
    id: 'google_drive_service',
    filename: 'google_drive_service.dart',
    path: 'lib/data/services/google_drive_service.dart',
    category: 'service',
    description: 'Servicio de autenticación (google_sign_in) y subida a Google Drive (googleapis) con scope drive.file.',
    language: 'dart',
    code: `import 'dart:io';
import 'package:camera/camera.dart';
import 'package:extension_google_sign_in_as_googleapis_auth/extension_google_sign_in_as_googleapis_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:googleapis/drive/v3.dart' as drive;

final googleDriveServiceProvider = Provider<GoogleDriveService>((ref) {
  return GoogleDriveService();
});

class GoogleDriveService {
  static const List<String> _scopes = [
    drive.DriveApi.driveFileScope,
  ];

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: _scopes,
  );

  GoogleSignInAccount? _currentUser;

  Future<GoogleSignInAccount?> getOrSignInUser() async {
    if (_currentUser != null) return _currentUser;
    try {
      _currentUser = await _googleSignIn.signInSilently();
      _currentUser ??= await _googleSignIn.signIn();
      return _currentUser;
    } catch (e) {
      debugPrint('Error en Google Sign-In: \$e');
      rethrow;
    }
  }

  Future<drive.DriveApi> _getDriveApi() async {
    final account = await getOrSignInUser();
    if (account == null) {
      throw Exception('El usuario canceló la autenticación con Google.');
    }

    final authClient = await _googleSignIn.authenticatedClient();
    if (authClient == null) {
      throw Exception('No se pudo generar cliente HTTP autenticado con Google.');
    }

    return drive.DriveApi(authClient);
  }

  Future<String?> uploadVideo({
    required XFile videoFile,
    String? sharedWithEmail,
    void Function(double progress)? onProgress,
  }) async {
    try {
      final driveApi = await _getDriveApi();
      final folderId = await _getOrCreateAppFolder(driveApi);

      final fileName = 'diario_\${DateTime.now().millisecondsSinceEpoch}.mp4';
      final driveFile = drive.File()
        ..name = fileName
        ..parents = [folderId]
        ..description = 'Entrada grabada con Diario Personal Multimedia';

      final localFile = File(videoFile.path);
      final fileSize = await localFile.length();
      final stream = localFile.openRead();

      final media = drive.Media(
        stream,
        fileSize,
        contentType: 'video/mp4',
      );

      onProgress?.call(0.3);

      final uploadedFile = await driveApi.files.create(
        driveFile,
        uploadMedia: media,
        $fields: 'id, name, webViewLink, webContentLink',
      );

      onProgress?.call(0.8);

      final fileId = uploadedFile.id;
      if (fileId == null) {
        throw Exception('Google Drive no devolvió un ID para el archivo subido.');
      }

      if (sharedWithEmail != null && sharedWithEmail.trim().isNotEmpty) {
        await _applyStrictSharingPermission(
          driveApi: driveApi,
          fileId: fileId,
          recipientEmail: sharedWithEmail.trim(),
        );
      }

      onProgress?.call(1.0);
      return fileId;
    } catch (e) {
      debugPrint('Error subiendo video a Google Drive: \$e');
      rethrow;
    }
  }

  Future<void> _applyStrictSharingPermission({
    required drive.DriveApi driveApi,
    required String fileId,
    required String recipientEmail,
  }) async {
    try {
      final permission = drive.Permission()
        ..role = 'reader'
        ..type = 'user'
        ..emailAddress = recipientEmail;

      await driveApi.permissions.create(
        permission,
        fileId,
        sendNotificationEmail: true,
      );
    } catch (e) {
      debugPrint('Advertencia: No se pudo asignar permiso en Drive: \$e');
    }
  }

  Future<String> _getOrCreateAppFolder(drive.DriveApi driveApi) async {
    const folderName = 'Diario Multimedia Personal';

    final search = await driveApi.files.list(
      q: "mimeType = 'application/vnd.google-apps.folder' and name = '\$folderName' and trashed = false",
      $fields: 'files(id, name)',
    );

    if (search.files != null && search.files!.isNotEmpty) {
      return search.files!.first.id!;
    }

    final folderMetadata = drive.File()
      ..name = folderName
      ..mimeType = 'application/vnd.google-apps.folder';

    final createdFolder = await driveApi.files.create(folderMetadata);
    return createdFolder.id!;
  }
}
`,
  },
  {
    id: 'recording_screen',
    filename: 'recording_screen.dart',
    path: 'lib/presentation/views/recording_screen.dart',
    category: 'ui',
    description: 'Widget de pantalla dividida con badge de conectividad en tiempo real y contador de sincronizaciones pendientes.',
    language: 'dart',
    code: `import 'dart:math' as math;
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../controllers/diary_controller.dart';
import '../../data/services/sync_coordinator.dart';
import '../widgets/notebook_paper_widget.dart';
import '../widgets/share_single_person_dialog.dart';

class RecordingScreen extends ConsumerStatefulWidget {
  final String userId;

  const RecordingScreen({
    super.key,
    required this.userId,
  });

  @override
  ConsumerState<RecordingScreen> createState() => _RecordingScreenState();
}

class _RecordingScreenState extends ConsumerState<RecordingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(diaryControllerProvider);
    final controller = ref.read(diaryControllerProvider.notifier);
    final syncCoordinator = ref.watch(syncCoordinatorProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Row(
          children: [
            Icon(Icons.auto_stories, color: Color(0xFFF59E0B), size: 22),
            SizedBox(width: 8),
            Text(
              'Diario Inteligente',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ],
        ),
        actions: [
          // Banner indicador de sincronización en vivo
          StreamBuilder<SyncProgressState>(
            stream: syncCoordinator.syncStateStream,
            builder: (context, snapshot) {
              final sync = snapshot.data;
              if (sync == null) return const SizedBox.shrink();

              if (!sync.isOnline) {
                return Container(
                  margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.amber.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, size: 13, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text(
                        sync.pendingCount > 0 ? 'Offline (\${sync.pendingCount})' : 'Offline',
                        style: const TextStyle(fontSize: 11, color: Colors.amber, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                );
              }

              if (sync.isSyncing) {
                return Container(
                  margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue.withOpacity(0.3)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 10,
                        height: 10,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.blue),
                      ),
                      SizedBox(width: 5),
                      Text(
                        'Sincronizando...',
                        style: TextStyle(fontSize: 11, color: Colors.blue, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                );
              }

              return const SizedBox.shrink();
            },
          ),

          IconButton(
            tooltip: 'Cambiar cámara',
            icon: Icon(
              state.isFrontCamera ? Icons.camera_front : Icons.camera_rear,
              color: Colors.white70,
            ),
            onPressed: state.status == RecordingStatus.recording
                ? null
                : () => controller.switchCamera(),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Stack(
          children: [
            // 1. HOJA DEL DIARIO EN TODA LA PANTALLA COMPLETA
            Positioned.fill(
              child: Container(
                margin: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.35),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: NotebookPaperWidget(
                  transcribedText: state.transcriptionText,
                  currentWords: state.currentWords,
                  isRecording: state.status == RecordingStatus.recording,
                ),
              ),
            ),

            // 2. VIDEO ENCIMA DE LA HOJA EN UNA ESQUINA COMO UN CUADRITO (PICTURE-IN-PICTURE)
            Positioned(
              top: 20,
              right: 24,
              width: 135,
              height: 185,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: const Color(0xFFF59E0B).withOpacity(0.8),
                    width: 2.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.6),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    if (state.isCameraInitialized && state.cameraController != null)
                      Center(
                        child: AspectRatio(
                          aspectRatio: state.cameraController!.value.aspectRatio,
                          child: CameraPreview(state.cameraController!),
                        ),
                      )
                    else
                      const Center(
                        child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
                      ),

                    // Badge REC en el cuadrito de video
                    if (state.status == RecordingStatus.recording)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.9),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              FadeTransition(
                                opacity: _pulseController,
                                child: Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '\${(state.recordingDurationSeconds ~/ 60).toString().padLeft(2, '0')}:\${(state.recordingDurationSeconds % 60).toString().padLeft(2, '0')}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                    // Indicador de cámara
                    Positioned(
                      bottom: 6,
                      left: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.65),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              state.isFrontCamera ? Icons.person : Icons.landscape,
                              size: 10,
                              color: Colors.amber,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              state.isFrontCamera ? 'Frontal' : 'Trasera',
                              style: const TextStyle(color: Colors.white, fontSize: 9),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 3. BOTÓN FLOTANTE DE GRABACIÓN ENCIMA DE LA HOJA
            Positioned(
              bottom: 24,
              left: 0,
              right: 0,
              child: Center(
                child: GestureDetector(
                  onTap: () async {
                    if (state.status == RecordingStatus.recording) {
                      final video = await controller.stopRecording();
                      if (video != null && context.mounted) {
                        _showSaveDialog(context, controller, widget.userId);
                      }
                    } else {
                      controller.startRecording();
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: state.status == RecordingStatus.recording
                          ? Colors.red
                          : const Color(0xFFF59E0B),
                      boxShadow: [
                        BoxShadow(
                          color: (state.status == RecordingStatus.recording
                                  ? Colors.red
                                  : const Color(0xFFF59E0B))
                              .withOpacity(0.4),
                          blurRadius: 16,
                          spreadRadius: 2,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Icon(
                        state.status == RecordingStatus.recording
                            ? Icons.stop
                            : Icons.fiber_manual_record,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSaveDialog(BuildContext context, DiaryController controller, String userId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => ShareSinglePersonDialog(
        onSave: (email) async {
          Navigator.pop(ctx);
          final success = await controller.saveAndUploadEntry(
            userId: userId,
            sharedWithEmail: email,
          );

          if (success && context.mounted) {
            final isOffline = controller.state.isOfflineSaved;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  isOffline
                      ? '📱 Entrada guardada en caché local. Se sincronizará automáticamente al volver la conexión.'
                      : '☁️ ¡Entrada subida a Google Drive y registrada confidencialmente!',
                ),
                backgroundColor: isOffline ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
              ),
            );
          }
        },
      ),
    );
  }
}
`,
  },
  {
    id: 'diary_entry_model',
    filename: 'diary_entry_model.dart',
    path: 'lib/data/models/diary_entry_model.dart',
    category: 'model',
    description: 'Modelo de datos con soporte para caché offline y regla estricta 1:1.',
    language: 'dart',
    code: `import 'package:cloud_firestore/cloud_firestore.dart';

class DiaryEntry {
  final String id;
  final String userId;
  final String transcriptionText;
  final String driveVideoId;
  final String? sharedWith; // Exactamente un correo o null
  final DateTime createdAt;
  final int durationSeconds;

  DiaryEntry({
    required this.id,
    required this.userId,
    required this.transcriptionText,
    required this.driveVideoId,
    this.sharedWith,
    required this.createdAt,
    required this.durationSeconds,
  }) {
    if (sharedWith != null && sharedWith!.trim().isNotEmpty) {
      _validateSingleEmail(sharedWith!.trim());
    }
  }

  static void _validateSingleEmail(String email) {
    if (email.contains(',') || email.contains(';')) {
      throw ArgumentError(
        'Violación de Privacidad: La entrada solo puede compartirse con exactamente UNA persona.',
      );
    }
    final emailRegex = RegExp(r'^[^@]+@[^@]+\\.[^@]+$');
    if (!emailRegex.hasMatch(email)) {
      throw ArgumentError('Formato de correo electrónico inválido: \$email');
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'user_id': userId,
      'transcription_text': transcriptionText,
      'drive_video_id': driveVideoId,
      'shared_with': sharedWith?.trim().toLowerCase(),
      'created_at': Timestamp.fromDate(createdAt),
      'duration_seconds': durationSeconds,
    };
  }

  factory DiaryEntry.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};

    return DiaryEntry(
      id: doc.id,
      userId: data['user_id'] as String? ?? '',
      transcriptionText: data['transcription_text'] as String? ?? '',
      driveVideoId: data['drive_video_id'] as String? ?? '',
      sharedWith: data['shared_with'] as String?,
      createdAt: (data['created_at'] as Timestamp?)?.toDate() ?? DateTime.now(),
      durationSeconds: data['duration_seconds'] as int? ?? 0,
    );
  }

  DiaryEntry copyWith({
    String? id,
    String? userId,
    String? transcriptionText,
    String? driveVideoId,
    String? sharedWith,
    DateTime? createdAt,
    int? durationSeconds,
  }) {
    return DiaryEntry(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      transcriptionText: transcriptionText ?? this.transcriptionText,
      driveVideoId: driveVideoId ?? this.driveVideoId,
      sharedWith: sharedWith ?? this.sharedWith,
      createdAt: createdAt ?? this.createdAt,
      durationSeconds: durationSeconds ?? this.durationSeconds,
    );
  }
}
`,
  },
  {
    id: 'notebook_paper_widget',
    filename: 'notebook_paper_widget.dart',
    path: 'lib/presentation/widgets/notebook_paper_widget.dart',
    category: 'ui',
    description: 'CustomPainter de la hoja de cuaderno pautada con tinta caligráfica animada.',
    language: 'dart',
    code: `import 'package:flutter/material.dart';

class NotebookPaperWidget extends StatefulWidget {
  final String transcribedText;
  final String currentWords;
  final bool isRecording;

  const NotebookPaperWidget({
    super.key,
    required this.transcribedText,
    required this.currentWords,
    required this.isRecording,
  });

  @override
  State<NotebookPaperWidget> createState() => _NotebookPaperWidgetState();
}

class _NotebookPaperWidgetState extends State<NotebookPaperWidget> {
  final ScrollController _scrollController = ScrollController();

  @override
  void didUpdateWidget(covariant NotebookPaperWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.currentWords != oldWidget.currentWords ||
        widget.transcribedText != oldWidget.transcribedText) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool hasContent =
        widget.transcribedText.isNotEmpty || widget.currentWords.isNotEmpty;

    return CustomPaint(
      painter: _NotebookPainter(lineHeight: 28.0),
      child: Stack(
        children: [
          // Espiral de anillas a la izquierda
          Positioned(
            left: 8,
            top: 12,
            bottom: 12,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(
                12,
                (_) => Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1D5DB),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.15),
                        blurRadius: 2,
                        offset: const Offset(1, 1),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.only(
              left: 48,
              right: 16,
              top: 10,
              bottom: 10,
            ),
            child: SingleChildScrollView(
              controller: _scrollController,
              physics: const BouncingScrollPhysics(),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 250),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Fecha: \${DateTime.now().day}/\${DateTime.now().month}/\${DateTime.now().year}',
                          style: const TextStyle(
                            fontFamily: 'Caveat',
                            fontSize: 16,
                            color: Color(0xFF475569),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (widget.isRecording)
                          const Row(
                            children: [
                              Text(
                                'Escribiendo en vivo...',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFFF59E0B),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(width: 4),
                              Icon(Icons.edit, size: 12, color: Color(0xFFF59E0B)),
                            ],
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (!hasContent)
                      Padding(
                        padding: const EdgeInsets.only(top: 24),
                        child: Text(
                          widget.isRecording
                              ? 'Habla con naturalidad... Tus palabras se escribirán sobre estos renglones.'
                              : 'Presiona el botón inferior para comenzar a grabar y transcribir.',
                          style: const TextStyle(
                            fontFamily: 'Caveat',
                            fontSize: 19,
                            color: Colors.black38,
                            fontStyle: FontStyle.italic,
                            height: 1.48,
                          ),
                        ),
                      )
                    else
                      RichText(
                        text: TextSpan(
                          style: const TextStyle(
                            fontFamily: 'Caveat',
                            fontSize: 22,
                            color: Color(0xFF0F172A),
                            height: 1.28,
                          ),
                          children: [
                            TextSpan(text: widget.transcribedText),
                            if (widget.currentWords.isNotEmpty)
                              TextSpan(
                                text: ' \${widget.currentWords}',
                                style: const TextStyle(
                                  color: Color(0xFF2563EB),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotebookPainter extends CustomPainter {
  final double lineHeight;
  _NotebookPainter({required this.lineHeight});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFFEFCF8);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final linePaint = Paint()
      ..color = const Color(0xFFBFDBFE).withOpacity(0.65)
      ..strokeWidth = 1.0;

    for (double y = lineHeight; y < size.height; y += lineHeight) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }

    final marginPaint = Paint()
      ..color = const Color(0xFFF43F5E).withOpacity(0.7)
      ..strokeWidth = 1.5;

    const double marginX = 40.0;
    canvas.drawLine(
      const Offset(marginX, 0),
      Offset(marginX, size.height),
      marginPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
`,
  },
  {
    id: 'firestore_service',
    filename: 'firestore_service.dart',
    path: 'lib/data/services/firestore_service.dart',
    category: 'service',
    description: 'Servicio de persistencia en Cloud Firestore.',
    language: 'dart',
    code: `import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/diary_entry_model.dart';

final firestoreServiceProvider = Provider<FirestoreService>((ref) {
  return FirestoreService();
});

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String collectionName = 'diary_entries';

  CollectionReference<Map<String, dynamic>> get _collection =>
      _firestore.collection(collectionName);

  Future<String> createEntry(DiaryEntry entry) async {
    final docRef = await _collection.add(entry.toMap());
    return docRef.id;
  }

  Stream<List<DiaryEntry>> getMyEntriesStream(String userId) {
    return _collection
        .where('user_id', isEqualTo: userId)
        .orderBy('created_at', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => DiaryEntry.fromFirestore(doc)).toList());
  }

  Stream<List<DiaryEntry>> getSharedWithMeEntriesStream(String userEmail) {
    return _collection
        .where('shared_with', isEqualTo: userEmail.trim().toLowerCase())
        .orderBy('created_at', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => DiaryEntry.fromFirestore(doc)).toList());
  }
}
`,
  },
  {
    id: 'firestore_rules',
    filename: 'firestore.rules',
    path: 'firestore.rules',
    category: 'rules',
    description: 'Reglas de seguridad de Firestore que blindan la Regla Estricta 1:1.',
    language: 'javascript',
    code: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /diary_entries/{entryId} {
      function isOwner(data) {
        return request.auth != null && request.auth.uid == data.user_id;
      }
      function isSharedWithRecipient(data) {
        return request.auth != null && 
               request.auth.token.email != null &&
               data.shared_with != null &&
               request.auth.token.email.lower() == data.shared_with.lower();
      }

      allow read: if isOwner(resource.data) || isSharedWithRecipient(resource.data);

      allow create: if request.auth != null &&
                       request.resource.data.user_id == request.auth.uid &&
                       request.resource.data.drive_video_id is string &&
                       request.resource.data.transcription_text is string &&
                       (request.resource.data.shared_with == null || 
                        (request.resource.data.shared_with is string && 
                         request.resource.data.shared_with.size() < 120));

      allow update, delete: if isOwner(resource.data);
    }
  }
}
`,
  },
  {
    id: 'pubspec_yaml',
    filename: 'pubspec.yaml',
    path: 'pubspec.yaml',
    category: 'config',
    description: 'Archivo de dependencias completo con conectividad y persistencia SQLite offline.',
    language: 'yaml',
    code: `name: multimedia_smart_diary
description: "Diario personal multimedia inteligente con grabación, transcripción, caché SQLite offline y auto-sync."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.3.0 <4.0.0'
  flutter: '>=3.19.0'

dependencies:
  flutter:
    sdk: flutter

  # Hardware Multimedia
  camera: ^0.11.0+2
  speech_to_text: ^7.0.0

  # Almacenamiento Temporal (Caché Local Offline)
  sqflite: ^2.3.3+1
  path: ^1.9.0

  # Detección de Conectividad y Sincronización Automática
  connectivity_plus: ^6.0.5

  # Integración Google Drive & OAuth
  google_sign_in: ^6.2.1
  googleapis: ^13.2.0
  extension_google_sign_in_as_googleapis_auth: ^2.0.12

  # Backend Cloud Firestore
  firebase_core: ^3.6.0
  cloud_firestore: ^5.4.4
  firebase_auth: ^5.3.1

  # Gestión de Estado
  flutter_riverpod: ^2.5.1
  permission_handler: ^11.3.1

  # UI & Tipografía
  google_fonts: ^6.2.1
  intl: ^0.19.0
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0

flutter:
  uses-material-design: true
`,
  },
];
