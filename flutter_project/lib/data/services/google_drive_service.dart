import 'dart:io';
import 'package:camera/camera.dart';
import 'package:extension_google_sign_in_as_googleapis_auth/extension_google_sign_in_as_googleapis_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:googleapis/drive/v3.dart' as drive;

final googleDriveServiceProvider = Provider<GoogleDriveService>((ref) {
  return GoogleDriveService();
});

/// Resultado estructurado de la subida a Google Drive
class DriveUploadResult {
  final String fileId;
  final String fileName;
  final String? webViewLink;
  final String? webContentLink;
  final String accountEmail;
  final String folderName;

  const DriveUploadResult({
    required this.fileId,
    required this.fileName,
    this.webViewLink,
    this.webContentLink,
    required this.accountEmail,
    required this.folderName,
  });

  /// Enlace web estándar de Google Drive para abrir el video en el navegador
  String get directDriveUrl =>
      webViewLink ?? 'https://drive.google.com/file/d/$fileId/view';
}

class GoogleDriveService {
  /// Scope específico para crear y gestionar archivos de la app sin acceder
  /// a fotos o archivos privados existentes del usuario.
  static const List<String> _scopes = [
    drive.DriveApi.driveFileScope,
  ];

  static const String appFolderName = 'Diario Multimedia Personal';

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: _scopes,
  );

  GoogleSignInAccount? _currentUser;

  /// Retorna el usuario autenticado con Google actual o inicia el flujo interactivo
  Future<GoogleSignInAccount?> getOrSignInUser() async {
    if (_currentUser != null) return _currentUser;
    try {
      _currentUser = await _googleSignIn.signInSilently();
      _currentUser ??= await _googleSignIn.signIn();
      return _currentUser;
    } catch (e) {
      debugPrint('Error en Google Sign-In: $e');
      rethrow;
    }
  }

  /// Retorna el correo de la cuenta de Google vinculada actualmente
  Future<String?> getCurrentUserEmail() async {
    final account = await getOrSignInUser();
    return account?.email;
  }

  /// Cierra la sesión de Google si el usuario desea cambiar de cuenta
  Future<void> signOut() async {
    await _googleSignIn.signOut();
    _currentUser = null;
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

  /// Sube un video grabado a la carpeta 'Diario Multimedia Personal' del usuario en Google Drive
  Future<DriveUploadResult?> uploadVideo({
    required XFile videoFile,
    String? sharedWithEmail,
    void Function(double progress)? onProgress,
  }) async {
    try {
      final user = await getOrSignInUser();
      final userEmail = user?.email ?? 'usuario_google';

      final driveApi = await _getDriveApi();
      final folderId = await _getOrCreateAppFolder(driveApi);

      final fileName = 'diario_${DateTime.now().millisecondsSinceEpoch}.mp4';
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

      onProgress?.call(0.25);

      final uploadedFile = await driveApi.files.create(
        driveFile,
        uploadMedia: media,
        $fields: 'id, name, webViewLink, webContentLink',
      );

      onProgress?.call(0.85);

      final fileId = uploadedFile.id;
      if (fileId == null) {
        throw Exception('Google Drive no devolvió un ID para el archivo subido.');
      }

      // Si el usuario especificó compartirlo estrictamente con 1 persona
      if (sharedWithEmail != null && sharedWithEmail.trim().isNotEmpty) {
        await _applyStrictSharingPermission(
          driveApi: driveApi,
          fileId: fileId,
          recipientEmail: sharedWithEmail.trim(),
        );
      }

      onProgress?.call(1.0);

      return DriveUploadResult(
        fileId: fileId,
        fileName: uploadedFile.name ?? fileName,
        webViewLink: uploadedFile.webViewLink,
        webContentLink: uploadedFile.webContentLink,
        accountEmail: userEmail,
        folderName: appFolderName,
      );
    } catch (e) {
      debugPrint('Error subiendo video a Google Drive: $e');
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
      debugPrint('Advertencia: No se pudo asignar permiso en Drive: $e');
    }
  }

  Future<String> _getOrCreateAppFolder(drive.DriveApi driveApi) async {
    final search = await driveApi.files.list(
      q: "mimeType = 'application/vnd.google-apps.folder' and name = '$appFolderName' and trashed = false",
      $fields: 'files(id, name)',
    );

    if (search.files != null && search.files!.isNotEmpty) {
      return search.files!.first.id!;
    }

    final folderMetadata = drive.File()
      ..name = appFolderName
      ..mimeType = 'application/vnd.google-apps.folder';

    final createdFolder = await driveApi.files.create(folderMetadata);
    return createdFolder.id!;
  }
}
