import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'presentation/views/recording_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: MultimediaDiaryApp(),
    ),
  );
}

class MultimediaDiaryApp extends StatelessWidget {
  const MultimediaDiaryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Diario Personal Multimedia',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFF59E0B),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
      ),
      home: const RecordingScreen(
        userId: 'kevin.2031.kg@gmail.com', // Reemplazar con ID de FirebaseAuth
      ),
    );
  }
}
