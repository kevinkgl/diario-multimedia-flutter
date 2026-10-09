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
      debugPrint('Error en Google Sign-In: $e');
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
    const folderName = 'Diario Multimedia Personal';

    final search = await driveApi.files.list(
      q: "mimeType = 'application/vnd.google-apps.folder' and name = '$folderName' and trashed = false",
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
