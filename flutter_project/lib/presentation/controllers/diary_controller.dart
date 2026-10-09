import 'dart:async';
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
  savedOffline,
  saved,
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
        errorMessage: 'Error de inicialización: ${e.toString()}',
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
        errorMessage: 'Error al iniciar la grabación: ${e.toString()}',
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

      final finalText = ('${state.transcriptionText} ${state.currentWords}').trim();
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
        errorMessage: 'Error al detener grabación: ${e.toString()}',
      );
      return null;
    }
  }

  Future<bool> saveAndUploadEntry({
    required String userId,
    String? sharedWithEmail,
  }) async {
    final video = state.recordedVideoFile;
    if (video == null) return false;

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
      debugPrint('Fallo al subir con red: $e. Fallback a caché local SQLite.');
      
      await _cacheService.saveToOfflineQueue(
        entry: entry,
        localVideoPath: video.path,
      );

      state = state.copyWith(
        status: RecordingStatus.savedOffline,
        isOfflineSaved: true,
        errorMessage: 'Sin conexión estable. Guardado localmente.',
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
          : '${state.transcriptionText} ${result.recognizedWords}';
      state = state.copyWith(transcriptionText: updated, currentWords: '');
    } else {
      state = state.copyWith(currentWords: result.recognizedWords);
    }
  }

  void _handleSpeechError(SpeechRecognitionError error) => debugPrint('STT Error: ${error.errorMsg}');
  void _handleSpeechStatus(String status) => debugPrint('STT Status: $status');

  @override
  void dispose() {
    _recordingTimer?.cancel();
    state.cameraController?.dispose();
    _speechToText.stop();
    super.dispose();
  }
}
