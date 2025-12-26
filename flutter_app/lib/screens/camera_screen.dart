import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:camera/camera.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'dart:convert';
import '../services/api_service.dart';
import '../services/location_service.dart';

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isProcessing = false;
  bool _isListening = false;
  String _recognizedText = '';
  Map<String, dynamic>? _recognitionResult;
  
  final SpeechToText _speechToText = SpeechToText();
  final FlutterTts _flutterTts = FlutterTts();

  @override
  void initState() {
    super.initState();
    _initCamera();
    _initSpeech();
  }

  Future<void> _initCamera() async {
    _cameras = await availableCameras();
    if (_cameras != null && _cameras!.isNotEmpty) {
      _controller = CameraController(_cameras![0], ResolutionPreset.medium);
      await _controller!.initialize();
      if (mounted) setState(() {});
    }
  }

  Future<void> _initSpeech() async {
    await _speechToText.initialize();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _captureAndRecognize() async {
    if (_controller == null || _isProcessing) return;
    
    setState(() => _isProcessing = true);
    
    try {
      final image = await _controller!.takePicture();
      final bytes = await image.readAsBytes();
      final base64Image = base64Encode(bytes);
      
      final locationService = Provider.of<LocationService>(context, listen: false);
      final position = await locationService.getCurrentLocation();
      
      final apiService = Provider.of<ApiService>(context, listen: false);
      final result = await apiService.processFrame(
        base64Image,
        position?.latitude,
        position?.longitude,
      );
      
      setState(() {
        _recognitionResult = result;
        _isProcessing = false;
      });
      
      if (result != null && result['recognizedPersons']?.isNotEmpty == true) {
        final person = result['recognizedPersons'][0];
        await _speak('This is ${person['name']}, your ${person['relation']}');
        _showPersonDialog(person);
      } else {
        await _speak('I don\'t recognize this person');
      }
    } catch (e) {
      setState(() => _isProcessing = false);
      _speak('Recognition failed');
    }
  }

  Future<void> _startListening() async {
    if (!_speechToText.isAvailable) return;
    
    setState(() => _isListening = true);
    
    await _speechToText.listen(
      onResult: (result) {
        setState(() => _recognizedText = result.recognizedWords);
        if (result.finalResult) {
          _processVoiceCommand(result.recognizedWords);
        }
      },
      listenFor: const Duration(seconds: 10),
    );
  }

  void _stopListening() {
    _speechToText.stop();
    setState(() => _isListening = false);
  }

  Future<void> _processVoiceCommand(String text) async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    final result = await apiService.parseVoiceCommand(text);
    
    if (result != null) {
      switch (result['action']) {
        case 'recognize_person':
          await _captureAndRecognize();
          break;
        case 'navigate_home':
          Navigator.pushNamed(context, '/sos');
          break;
        case 'sos_alert':
          Navigator.pushNamed(context, '/sos');
          break;
        default:
          _speak('Command not recognized');
      }
    }
    setState(() => _isListening = false);
  }

  Future<void> _speak(String text) async {
    await _flutterTts.speak(text);
  }

  void _showPersonDialog(Map<String, dynamic> person) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(person['name'] ?? 'Unknown'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Relation: ${person['relation'] ?? 'Unknown'}'),
            if (person['confidence'] != null)
              Text('Confidence: ${((person['confidence'] ?? 0) * 100).toStringAsFixed(0)}%'),
            if (person['memories']?.isNotEmpty == true)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text('Has ${person['memories'].length} memory(s)'),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          if (person['memories']?.isNotEmpty == true)
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                _speak(person['memories'][0]['description'] ?? 'Memory with ${person['name']}');
              },
              child: const Text('Play Memory'),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Recognize Person'),
        actions: [
          IconButton(
            icon: Icon(_isListening ? Icons.mic : Icons.mic_none),
            onPressed: _isListening ? _stopListening : _startListening,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _controller?.value.isInitialized == true
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: CameraPreview(_controller!),
                )
              : const Center(child: CircularProgressIndicator()),
          ),
          if (_isListening)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text('Listening: $_recognizedText',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
            ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                FloatingActionButton.extended(
                  heroTag: 'voice',
                  onPressed: _isListening ? _stopListening : _startListening,
                  icon: Icon(_isListening ? Icons.stop : Icons.mic),
                  label: Text(_isListening ? 'Stop' : 'Voice'),
                ),
                FloatingActionButton.large(
                  heroTag: 'capture',
                  onPressed: _isProcessing ? null : _captureAndRecognize,
                  child: _isProcessing
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Icon(Icons.camera_alt, size: 36),
                ),
                FloatingActionButton.extended(
                  heroTag: 'info',
                  onPressed: () {},
                  icon: const Icon(Icons.info),
                  label: const Text('Help'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
