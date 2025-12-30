import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// SimplifiedModeScreen - Ultra-accessible interface with just 3 buttons
/// Designed for Alzheimer's patients with varying cognitive abilities
class SimplifiedModeScreen extends StatefulWidget {
  const SimplifiedModeScreen({super.key});

  @override
  State<SimplifiedModeScreen> createState() => _SimplifiedModeScreenState();
}

class _SimplifiedModeScreenState extends State<SimplifiedModeScreen>
    with TickerProviderStateMixin {
  final FlutterTts _tts = FlutterTts();
  late AnimationController _pulseController;
  late AnimationController _breatheController;

  String _feedbackMessage = '';
  Color _backgroundColor = const Color(0xFFF5F5F5);

  @override
  void initState() {
    super.initState();
    _initializeTts();
    _initializeAnimations();
    _speakWelcome();
  }

  void _initializeAnimations() {
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _breatheController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);
  }

  Future<void> _initializeTts() async {
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.4); // Slower for clarity
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.0);
  }

  Future<void> _speakWelcome() async {
    await Future.delayed(const Duration(milliseconds: 500));
    await _speak(
        'Hello! I\'m here to help. Tap any large button when you need me.');
  }

  Future<void> _speak(String text) async {
    await _tts.stop();
    await _tts.speak(text);
  }

  void _provideHapticFeedback() {
    HapticFeedback.heavyImpact();
  }

  Future<void> _handleFaceButton() async {
    _provideHapticFeedback();
    setState(() {
      _feedbackMessage = 'Looking for faces...';
    });
    await _speak('I\'m looking to see who is around you. Please wait.');

    // In production, trigger camera face recognition
    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _feedbackMessage = 'This is Sarah, your daughter!';
    });
    await _speak('I see Sarah. She is your daughter. She loves you very much.');
  }

  Future<void> _handleMedicineButton() async {
    _provideHapticFeedback();
    setState(() {
      _feedbackMessage = 'Checking your medicines...';
    });
    await _speak('Let me check your medicine schedule.');

    await Future.delayed(const Duration(seconds: 1));

    final now = DateTime.now();
    String medicineMessage;

    if (now.hour >= 8 && now.hour < 12) {
      medicineMessage =
          'Your morning medicine was due at 8 AM. Have you taken it?';
    } else if (now.hour >= 12 && now.hour < 18) {
      medicineMessage =
          'Your afternoon medicine is due at 2 PM. Let me remind you.';
    } else {
      medicineMessage =
          'Your evening medicine is due at 8 PM. I\'ll remind you then.';
    }

    setState(() {
      _feedbackMessage = medicineMessage;
    });
    await _speak(medicineMessage);
  }

  Future<void> _handleHelpButton() async {
    _provideHapticFeedback();
    setState(() {
      _feedbackMessage = 'Getting help...';
      _backgroundColor = const Color(0xFFFFE0E0);
    });
    await _speak(
        'I\'m calling for help now. Someone will be with you very soon. Stay calm, you are safe.');

    // In production, trigger SOS alert
    await Future.delayed(const Duration(seconds: 2));

    setState(() {
      _feedbackMessage = 'Help is on the way! Sarah has been notified.';
    });
    await _speak('Sarah has been notified and is on her way. You are safe.');

    await Future.delayed(const Duration(seconds: 3));
    setState(() {
      _backgroundColor = const Color(0xFFF5F5F5);
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _breatheController.dispose();
    _tts.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.accessibility_new,
                color: Colors.blue.shade700, size: 28),
            const SizedBox(width: 8),
            Text(
              'ARKA',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.blue.shade700,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.exit_to_app, size: 28),
            color: Colors.grey.shade600,
            onPressed: () {
              Navigator.of(context).pop();
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              // Feedback message
              if (_feedbackMessage.isNotEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  margin: const EdgeInsets.only(bottom: 24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Text(
                    _feedbackMessage,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w500,
                      height: 1.4,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),

              // Main buttons
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // FACE button
                    _buildMainButton(
                      icon: Icons.face,
                      label: 'WHO IS THIS?',
                      color: Colors.blue,
                      onTap: _handleFaceButton,
                    ),

                    // MEDICINE button
                    _buildMainButton(
                      icon: Icons.medication,
                      label: 'MEDICINE',
                      color: Colors.orange,
                      onTap: _handleMedicineButton,
                    ),

                    // HELP button (larger and more prominent)
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, child) {
                        return Transform.scale(
                          scale: 1.0 + (_pulseController.value * 0.05),
                          child: _buildMainButton(
                            icon: Icons.emergency,
                            label: 'HELP',
                            color: Colors.red,
                            onTap: _handleHelpButton,
                            isEmergency: true,
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),

              // Bottom status
              AnimatedBuilder(
                animation: _breatheController,
                builder: (context, child) {
                  return Opacity(
                    opacity: 0.5 + (_breatheController.value * 0.5),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'You are safe at home',
                          style: TextStyle(
                            fontSize: 18,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMainButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
    bool isEmergency = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        height: isEmergency ? 150 : 130,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withOpacity(0.9), color],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.4),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: isEmergency ? 56 : 48,
              color: Colors.white,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: isEmergency ? 28 : 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
