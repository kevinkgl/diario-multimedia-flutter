import 'package:cloud_firestore/cloud_firestore.dart';

class DiaryEntry {
  final String id;
  final String userId;
  final String transcriptionText;
  final String driveVideoId;
  final String? sharedWith; // Exactamente un correo o null (Regla 1:1)
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
    final emailRegex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
    if (!emailRegex.hasMatch(email)) {
      throw ArgumentError('Formato de correo electrónico inválido: $email');
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
