import 'package:flutter/material.dart';
import '../services/training_service.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// CognitiveTrainingScreen - Memory training with spaced repetition
class CognitiveTrainingScreen extends StatefulWidget {
  const CognitiveTrainingScreen({super.key});

  @override
  State<CognitiveTrainingScreen> createState() =>
      _CognitiveTrainingScreenState();
}

class _CognitiveTrainingScreenState extends State<CognitiveTrainingScreen> {
  final FlutterTts _tts = FlutterTts();
  TrainingSession? _session;
  TrainingProgress? _progress;
  int _currentExerciseIndex = 0;
  bool _isLoading = true;
  bool _showResult = false;
  bool _lastAnswerCorrect = false;
  String _encouragement = '';

  // Mock data for demo
  final List<MockPerson> _mockPeople = [
    MockPerson(
        id: '1',
        name: 'Sarah',
        relationship: 'Daughter',
        imageColor: Colors.pink),
    MockPerson(
        id: '2', name: 'Michael', relationship: 'Son', imageColor: Colors.blue),
    MockPerson(
        id: '3',
        name: 'Dr. Smith',
        relationship: 'Doctor',
        imageColor: Colors.green),
    MockPerson(
        id: '4',
        name: 'Emma',
        relationship: 'Nurse',
        imageColor: Colors.purple),
  ];

  @override
  void initState() {
    super.initState();
    _initializeTts();
    _loadSession();
    _loadProgress();
  }

  Future<void> _initializeTts() async {
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.45);
  }

  Future<void> _speak(String text) async {
    await _tts.speak(text);
  }

  Future<void> _loadSession() async {
    setState(() => _isLoading = true);

    // In production, call TrainingService.getNextSession()
    await Future.delayed(const Duration(seconds: 1));

    setState(() {
      _session = _createMockSession();
      _isLoading = false;
    });

    await _speak(
        'Let\'s exercise your memory! I\'ll show you some faces. Try to remember who they are.');
  }

  Future<void> _loadProgress() async {
    // In production, call TrainingService.getProgress()
    setState(() {
      _progress = TrainingProgress(
        totalSessions: 48,
        totalExercises: 156,
        overallAccuracy: 0.78,
        currentStreak: 12,
        longestStreak: 18,
        strongestMemories: ['Sarah', 'Michael'],
        needsReinforcement: ['Dr. Smith'],
        achievements: [
          Achievement(
              name: 'First Steps',
              icon: '🎯',
              description: 'Completed first session'),
          Achievement(
              name: '7-Day Streak',
              icon: '🔥',
              description: 'Train for 7 days'),
        ],
      );
    });
  }

  TrainingSession _createMockSession() {
    return TrainingSession(
      sessionId: 'session_demo',
      sessionType: 'full',
      estimatedDuration: 5,
      exercises: List.generate(
          4,
          (i) => TrainingExercise(
                exerciseId: 'ex_$i',
                personId: _mockPeople[i].id,
                type: 'face_match',
                name: 'Who is this?',
                description: 'Match the face with the correct name',
                difficulty: 2 + (i % 3),
                timeLimit: 30,
                hintsAvailable: true,
              )),
      difficulty: 'balanced',
      encouragement: 'Let\'s strengthen your memories today!',
    );
  }

  void _handleAnswer(String selectedName) {
    if (_session == null) return;

    final currentExercise = _session!.exercises[_currentExerciseIndex];
    final correctPerson =
        _mockPeople.firstWhere((p) => p.id == currentExercise.personId);
    final isCorrect = selectedName == correctPerson.name;

    setState(() {
      _showResult = true;
      _lastAnswerCorrect = isCorrect;
      _encouragement = isCorrect
          ? [
              'Excellent!',
              'That\'s right!',
              'Great job!',
              'Wonderful!'
            ][_currentExerciseIndex % 4]
          : 'That\'s okay! This is ${correctPerson.name}, your ${correctPerson.relationship}.';
    });

    _speak(_encouragement);
  }

  void _nextExercise() {
    if (_currentExerciseIndex < (_session?.exercises.length ?? 0) - 1) {
      setState(() {
        _currentExerciseIndex++;
        _showResult = false;
      });
    } else {
      _showCompletionDialog();
    }
  }

  void _showCompletionDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            const Text('🎉 ', style: TextStyle(fontSize: 32)),
            const Text('Session Complete!'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Great job! You completed ${_session?.exercises.length ?? 0} exercises.',
              style: const TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 16),
            _buildProgressStat(
                'Current Streak',
                '${_progress?.currentStreak ?? 0} days',
                Icons.local_fire_department,
                Colors.orange),
            const SizedBox(height: 8),
            _buildProgressStat(
                'Accuracy',
                '${((_progress?.overallAccuracy ?? 0) * 100).round()}%',
                Icons.check_circle,
                Colors.green),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: const Text('Done'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              _loadSession();
              setState(() {
                _currentExerciseIndex = 0;
                _showResult = false;
              });
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Train More'),
          ),
        ],
      ),
    );

    _speak(
        'Great job! You completed the session. Your memory is getting stronger every day!');
  }

  Widget _buildProgressStat(
      String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 12),
          Expanded(child: Text(label)),
          Text(value,
              style: TextStyle(fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text(
          'Memory Training',
          style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black54),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Colors.orange, Colors.deepOrange],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Icon(Icons.local_fire_department,
                    color: Colors.white, size: 18),
                const SizedBox(width: 4),
                Text(
                  '${_progress?.currentStreak ?? 0}',
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildExerciseView(),
    );
  }

  Widget _buildExerciseView() {
    if (_session == null || _session!.exercises.isEmpty) {
      return const Center(child: Text('No exercises available'));
    }

    final exercise = _session!.exercises[_currentExerciseIndex];
    final person = _mockPeople.firstWhere((p) => p.id == exercise.personId);

    return Column(
      children: [
        // Progress indicator
        Container(
          padding: const EdgeInsets.all(16),
          color: Colors.white,
          child: Row(
            children: [
              Text(
                '${_currentExerciseIndex + 1}/${_session!.exercises.length}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: LinearProgressIndicator(
                  value:
                      (_currentExerciseIndex + 1) / _session!.exercises.length,
                  backgroundColor: Colors.grey.shade200,
                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.blue),
                ),
              ),
            ],
          ),
        ),

        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Text(
                  'Who is this person?',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 32),

                // Face display
                Hero(
                  tag: 'face_${person.id}',
                  child: Container(
                    width: 180,
                    height: 180,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          person.imageColor.withOpacity(0.8),
                          person.imageColor
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: person.imageColor.withOpacity(0.4),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        person.name[0],
                        style: const TextStyle(
                          fontSize: 72,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 40),

                // Answer options or result
                if (_showResult)
                  _buildResultView(person)
                else
                  _buildAnswerOptions(person),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAnswerOptions(MockPerson correctPerson) {
    final shuffled = List<MockPerson>.from(_mockPeople)..shuffle();

    return Expanded(
      child: GridView.count(
        crossAxisCount: 2,
        mainAxisSpacing: 16,
        crossAxisSpacing: 16,
        childAspectRatio: 2.5,
        children: shuffled.map((person) {
          return ElevatedButton(
            onPressed: () => _handleAnswer(person.name),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: Colors.black87,
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: Text(
              person.name,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildResultView(MockPerson person) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: _lastAnswerCorrect
                  ? Colors.green.shade50
                  : Colors.orange.shade50,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                Icon(
                  _lastAnswerCorrect ? Icons.check_circle : Icons.info_outline,
                  size: 56,
                  color: _lastAnswerCorrect ? Colors.green : Colors.orange,
                ),
                const SizedBox(height: 16),
                Text(
                  _encouragement,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: _lastAnswerCorrect
                        ? Colors.green.shade800
                        : Colors.orange.shade800,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  '${person.name} is your ${person.relationship}',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey.shade700,
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: _nextExercise,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Text(
                _currentExerciseIndex < (_session!.exercises.length - 1)
                    ? 'Next'
                    : 'Finish',
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class MockPerson {
  final String id;
  final String name;
  final String relationship;
  final Color imageColor;

  MockPerson({
    required this.id,
    required this.name,
    required this.relationship,
    required this.imageColor,
  });
}
