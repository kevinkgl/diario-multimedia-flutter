import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import '../models/diary_entry_model.dart';

final offlineCacheServiceProvider = Provider<OfflineCacheService>((ref) {
  return OfflineCacheService();
});

enum SyncStatus {
  pending,
  syncing,
  synced,
  failed,
}

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
          CREATE TABLE $tableName (
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

  Future<void> saveToOfflineQueue({
    required DiaryEntry entry,
    required String localVideoPath,
  }) async {
    final db = await database;

    await db.insert(
      tableName,
      {
        'id': entry.id.isEmpty ? 'offline_${DateTime.now().millisecondsSinceEpoch}' : entry.id,
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
  }

  Future<List<Map<String, dynamic>>> getPendingEntries() async {
    final db = await database;
    return await db.query(
      tableName,
      where: 'sync_status = ? OR sync_status = ?',
      whereArgs: [SyncStatus.pending.name, SyncStatus.failed.name],
      orderBy: 'created_at ASC',
    );
  }

  Future<void> markAsSyncing(String id) async {
    final db = await database;
    await db.update(
      tableName,
      {'sync_status': SyncStatus.syncing.name},
      where: 'id = ?',
      whereArgs: [id],
    );
  }

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

  Future<void> markSyncFailed({
    required String localId,
    required String errorMessage,
  }) async {
    final db = await database;
    await db.rawUpdate('''
      UPDATE $tableName 
      SET sync_status = ?, 
          sync_attempts = sync_attempts + 1, 
          last_sync_error = ? 
      WHERE id = ?
    ''', [SyncStatus.failed.name, errorMessage, localId]);
  }

  Future<int> countPendingSync() async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM $tableName WHERE sync_status != ?',
      [SyncStatus.synced.name],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }
}
