import 'package:flutter/material.dart';

class NotebookPaperWidget extends StatefulWidget {
  final String transcribedText;
  final String currentWords;
  final bool isRecording;

  const NotebookPaperWidget({
    super.key,
    required this.transcribedText,
    required this.currentWords,
    required this.isRecording,
  });

  @override
  State<NotebookPaperWidget> createState() => _NotebookPaperWidgetState();
}

class _NotebookPaperWidgetState extends State<NotebookPaperWidget> {
  final ScrollController _scrollController = ScrollController();

  @override
  void didUpdateWidget(covariant NotebookPaperWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.currentWords != oldWidget.currentWords ||
        widget.transcribedText != oldWidget.transcribedText) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients) {
          _scrollController.animateTo(
            _scrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool hasContent =
        widget.transcribedText.isNotEmpty || widget.currentWords.isNotEmpty;

    return CustomPaint(
      painter: _NotebookPainter(lineHeight: 28.0),
      child: Stack(
        children: [
          Positioned(
            left: 8,
            top: 12,
            bottom: 12,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(
                12,
                (_) => Container(
                  width: 10,
                  height: 10,
                  decoration: BoxDecoration(
                    color: const Color(0xFFD1D5DB),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.15),
                        blurRadius: 2,
                        offset: const Offset(1, 1),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.only(
              left: 48,
              right: 16,
              top: 10,
              bottom: 10,
            ),
            child: SingleChildScrollView(
              controller: _scrollController,
              physics: const BouncingScrollPhysics(),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 250),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Fecha: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
                          style: const TextStyle(
                            fontFamily: 'Caveat',
                            fontSize: 16,
                            color: Color(0xFF475569),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (widget.isRecording)
                          const Row(
                            children: [
                              Text(
                                'Escribiendo en vivo...',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFFF59E0B),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              SizedBox(width: 4),
                              Icon(Icons.edit, size: 12, color: Color(0xFFF59E0B)),
                            ],
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    if (!hasContent)
                      Padding(
                        padding: const EdgeInsets.only(top: 24),
                        child: Text(
                          widget.isRecording
                              ? 'Habla con naturalidad... Tus palabras se escribirán sobre estos renglones en tiempo real.'
                              : 'Presiona el botón inferior para comenzar a grabar y transcribir.',
                          style: const TextStyle(
                            fontFamily: 'Caveat',
                            fontSize: 19,
                            color: Colors.black38,
                            fontStyle: FontStyle.italic,
                            height: 1.48,
                          ),
                        ),
                      )
                    else
                      RichText(
                        text: TextSpan(
                          style: const TextStyle(
                            fontFamily: 'Caveat',
                            fontSize: 22,
                            color: Color(0xFF0F172A),
                            height: 1.28,
                          ),
                          children: [
                            TextSpan(text: widget.transcribedText),
                            if (widget.currentWords.isNotEmpty)
                              TextSpan(
                                text: ' ${widget.currentWords}',
                                style: const TextStyle(
                                  color: Color(0xFF2563EB),
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotebookPainter extends CustomPainter {
  final double lineHeight;
  _NotebookPainter({required this.lineHeight});

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = const Color(0xFFFEFCF8);
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);

    final linePaint = Paint()
      ..color = const Color(0xFFBFDBFE).withOpacity(0.65)
      ..strokeWidth = 1.0;

    for (double y = lineHeight; y < size.height; y += lineHeight) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }

    final marginPaint = Paint()
      ..color = const Color(0xFFF43F5E).withOpacity(0.7)
      ..strokeWidth = 1.5;

    const double marginX = 40.0;
    canvas.drawLine(
      const Offset(marginX, 0),
      Offset(marginX, size.height),
      marginPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
