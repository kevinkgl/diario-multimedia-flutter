import 'dart:async';
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
    return '$committedText $interimWords';
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
        errorMessage: 'Error al inicializar SpeechToText: $e',
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
        errorMessage: 'Error al iniciar transcripción: $e',
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
            : '${state.committedText} $recognized';

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
    debugPrint('[SpeechToText] Estado: $status');
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
    debugPrint('[SpeechToText] Error: ${error.errorMsg} (permanente: ${error.permanent})');
    if (error.permanent) {
      state = state.copyWith(
        isListening: false,
        soundLevel: 0.0,
        errorMessage: 'Error de reconocimiento: ${error.errorMsg}',
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
