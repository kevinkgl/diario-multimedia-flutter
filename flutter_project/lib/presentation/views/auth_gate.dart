import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'login_screen.dart';
import 'recording_screen.dart';

/// AuthGate determina automáticamente si el usuario ya tiene sesión iniciada con Google
/// o si debe mostrar la pantalla de Login.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        // Mientras valida la sesión activa
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            backgroundColor: Color(0xFF090D16),
            body: Center(
              child: CircularProgressIndicator(
                color: Color(0xFFF59E0B),
              ),
            ),
          );
        }

        // Si el usuario tiene una sesión activa con Firebase / Google
        if (snapshot.hasData && snapshot.data != null) {
          final user = snapshot.data!;
          return RecordingScreen(
            userId: user.email ?? user.uid,
          );
        }

        // Si no ha iniciado sesión, mostrar la vista de Login
        return const LoginScreen();
      },
    );
  }
}
