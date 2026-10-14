import 'package:camera/camera.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../controllers/diary_controller.dart';
import '../../data/services/sync_coordinator.dart';
import '../widgets/notebook_paper_widget.dart';
import '../widgets/share_single_person_dialog.dart';
import 'login_screen.dart';

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
            tooltip: 'Estado Google Drive',
            icon: const Icon(Icons.cloud_done, color: Color(0xFF38BDF8), size: 20),
            onPressed: () => _showDriveAccountInfo(context, widget.userId),
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
                                '${(state.recordingDurationSeconds ~/ 60).toString().padLeft(2, '0')}:${(state.recordingDurationSeconds % 60).toString().padLeft(2, '0')}',
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
            if (isOffline) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    '📱 Entrada guardada en caché local SQLite. Se subirá automáticamente a tu Google Drive al detectar internet.',
                  ),
                  backgroundColor: Color(0xFFF59E0B),
                  duration: Duration(seconds: 4),
                ),
              );
            } else {
              _showDriveSuccessDialog(context, controller, userId);
            }
          }
        },
      ),
    );
  }

  void _showDriveSuccessDialog(BuildContext context, DiaryController controller, String defaultUserId) {
    final state = controller.state;
    final accountEmail = state.driveAccountEmail ?? defaultUserId;
    final fileName = state.driveFileName ?? 'diario_${DateTime.now().millisecondsSinceEpoch}.mp4';
    final webLink = state.driveWebViewLink ?? 'https://drive.google.com';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.cloud_done, color: Color(0xFF10B981), size: 24),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                '¡Subido a tu Google Drive!',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tu video ha quedado almacenado directamente en tu cuenta personal de Google Drive:',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 16),
            _buildInfoRow(Icons.account_circle, 'Cuenta Google', accountEmail),
            const SizedBox(height: 10),
            _buildInfoRow(Icons.folder, 'Carpeta en Drive', 'Diario Multimedia Personal'),
            const SizedBox(height: 10),
            _buildInfoRow(Icons.videocam, 'Archivo', fileName),
            const SizedBox(height: 10),
            _buildInfoRow(Icons.link, 'Enlace directo', webLink, isLink: true),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Entendido', style: TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showDriveAccountInfo(BuildContext context, String userId) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.add_to_drive, color: Color(0xFF38BDF8), size: 24),
            SizedBox(width: 10),
            Text(
              'Google Drive Vinculado',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'La aplicación utiliza la cuenta con la que inicias sesión para subir los videos directamente a tu Google Drive personal:',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 16),
            _buildInfoRow(Icons.mail, 'Cuenta activa', userId),
            const SizedBox(height: 10),
            _buildInfoRow(Icons.folder_shared, 'Carpeta asignada', 'Diario Multimedia Personal'),
            const SizedBox(height: 10),
            _buildInfoRow(Icons.security, 'Permisos (Scope)', 'drive.file (Solo archivos del diario)'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.lock, size: 14, color: Colors.greenAccent),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Tus otros archivos personales y fotos de Drive permanecen totalmente privados e inaccesibles para la app.',
                      style: TextStyle(fontSize: 11, color: Colors.white60),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await FirebaseAuth.instance.signOut();
                await GoogleSignIn().signOut();
              } catch (_) {}
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            icon: const Icon(Icons.logout, size: 16, color: Colors.redAccent),
            label: const Text('Cerrar sesión', style: TextStyle(color: Colors.redAccent)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF59E0B),
              foregroundColor: const Color(0xFF0F172A),
            ),
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Aceptar', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, {bool isLink = false}) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.25),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: const Color(0xFFF59E0B)),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: Colors.white38, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 12,
                    color: isLink ? const Color(0xFF38BDF8) : Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
