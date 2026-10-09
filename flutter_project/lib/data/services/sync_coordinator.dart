import 'dart:async';
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
      debugPrint('Conectividad: Online=$isOnline');

      if (isOnline) {
        await processSyncQueue();
      } else {
        _notifyState(isOnline: false, isSyncing: false);
      }
    });

    processSyncQueue();
  }

  Future<void> processSyncQueue() async {
    if (_isSyncing) return;

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
      operation: 'Sincronizando ${pendingList.length} entradas pendientes...',
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

        if (driveVideoId == null || driveVideoId.isEmpty) {
          final videoFile = File(videoPath);
          if (!await videoFile.exists()) {
            throw Exception('Archivo de video no encontrado: $videoPath');
          }

          driveVideoId = await _driveService.uploadVideo(
            videoFile: XFile(videoPath),
            sharedWithEmail: sharedWith,
          );

          if (driveVideoId == null) {
            throw Exception('Fallo al obtener ID de Drive.');
          }
        }

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

        await _cacheService.markAsSynced(
          localId: localId,
          driveVideoId: driveVideoId,
        );
      } catch (e) {
        debugPrint('Error sincronizando: $e');
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
      operation: remaining == 0 ? 'Sincronización finalizada' : null,
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
