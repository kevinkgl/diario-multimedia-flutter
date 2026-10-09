import 'package:flutter/material.dart';

class ShareSinglePersonDialog extends StatefulWidget {
  final Future<void> Function(String? email) onSave;

  const ShareSinglePersonDialog({super.key, required this.onSave});

  @override
  State<ShareSinglePersonDialog> createState() => _ShareSinglePersonDialogState();
}

class _ShareSinglePersonDialogState extends State<ShareSinglePersonDialog> {
  final TextEditingController _emailController = TextEditingController();
  String? _errorMessage;
  bool _isLoading = false;

  bool _validateEmail(String value) {
    if (value.trim().isEmpty) return true;
    if (value.contains(',') || value.contains(';')) {
      setState(() {
        _errorMessage = 'Regla Estricta: Solo puedes compartir con exactamente 1 persona.';
      });
      return false;
    }
    final regex = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
    if (!regex.hasMatch(value.trim())) {
      setState(() {
        _errorMessage = 'Ingresa un formato de correo válido.';
      });
      return false;
    }
    setState(() => _errorMessage = null);
    return true;
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF1E293B),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.lock_outline, color: Color(0xFFF59E0B)),
              SizedBox(width: 8),
              Text(
                'Guardar y Compartir Entrada',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Regla de Privacidad 1:1: Puedes asignar un único correo confidencial o dejarlo vacío para que sea 100% privado.',
            style: TextStyle(fontSize: 12, color: Colors.white70),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'correo.confidente@ejemplo.com (Opcional)',
              hintStyle: const TextStyle(color: Colors.white38),
              filled: true,
              fillColor: const Color(0xFF0F172A),
              errorText: _errorMessage,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide.none,
              ),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF59E0B),
                foregroundColor: const Color(0xFF0F172A),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _isLoading
                  ? null
                  : () async {
                      if (!_validateEmail(_emailController.text)) return;
                      setState(() => _isLoading = true);
                      final email = _emailController.text.trim();
                      await widget.onSave(email.isEmpty ? null : email);
                      if (mounted) setState(() => _isLoading = false);
                    },
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                    )
                  : const Text('Confirmar y Guardar', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
