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
                        sync.pendingCount > 0 ? 'Offline (${sync.pendingCount})' : 'Offline',
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
        child: Column(
          children: [
            Expanded(
              flex: 5,
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(24),
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

                    if (state.status == RecordingStatus.recording)
                      Positioned(
                        top: 14,
                        left: 14,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.85),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            children: [
                              FadeTransition(
                                opacity: _pulseController,
                                child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${(state.recordingDurationSeconds ~/ 60).toString().padLeft(2, '0')}:${(state.recordingDurationSeconds % 60).toString().padLeft(2, '0')}',
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),

            Expanded(
              flex: 5,
              child: Container(
                margin: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                ),
                clipBehavior: Clip.antiAlias,
                child: NotebookPaperWidget(
                  transcribedText: state.transcriptionText,
                  currentWords: state.currentWords,
                  isRecording: state.status == RecordingStatus.recording,
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.only(bottom: 16),
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
                  width: 74,
                  height: 74,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: state.status == RecordingStatus.recording
                        ? Colors.red
                        : const Color(0xFFF59E0B),
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
