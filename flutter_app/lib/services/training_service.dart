import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// TrainingService - Memory training with spaced repetition
class TrainingService {
  static const String baseUrl = ApiConfig.apiBaseUrl;

  /// Get next training session
  static Future<TrainingSession> getNextSession({
    required String userId,
    String sessionType = 'full',
  }) async {
    try {
      final response = await http.get(
        Uri.parse(
            '$baseUrl/api/training/next-session/$userId?sessionType=$sessionType'),
      );

      if (response.statusCode == 200) {
        return TrainingSession.fromJson(jsonDecode(response.body));
      }
      throw Exception('Failed to get training session');
    } catch (e) {
      print('Training session error: $e');
      return TrainingSession.empty();
    }
  }

  /// Submit exercise result
  static Future<TrainingResult> submitResult({
    required String userId,
    required String sessionId,
    required String exerciseId,
    required String personId,
    required bool correct,
    double? responseTime,
    int attempts = 1,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/training/submit-result'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'sessionId': sessionId,
          'exerciseId': exerciseId,
          'personId': personId,
          'correct': correct,
          'responseTime': responseTime,
          'attempts': attempts,
        }),
      );

      if (response.statusCode == 200) {
        return TrainingResult.fromJson(jsonDecode(response.body));
      }
      throw Exception('Result submission failed');
    } catch (e) {
      print('Submit result error: $e');
      return TrainingResult.empty();
    }
  }

  /// Get training progress
  static Future<TrainingProgress> getProgress({
    required String userId,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/training/progress/$userId'),
      );

      if (response.statusCode == 200) {
        return TrainingProgress.fromJson(jsonDecode(response.body));
      }
      throw Exception('Progress fetch failed');
    } catch (e) {
      print('Progress error: $e');
      return TrainingProgress.empty();
    }
  }

  /// Get relationship map with memory strengths
  static Future<List<RelationshipStrength>> getRelationshipMap({
    required String userId,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/training/relationship-map/$userId'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return (data['relationships'] as List)
            .map((r) => RelationshipStrength.fromJson(r))
            .toList();
      }
      throw Exception('Relationship map fetch failed');
    } catch (e) {
      print('Relationship map error: $e');
      return [];
    }
  }
}

/// Training session with exercises
class TrainingSession {
  final String sessionId;
  final String sessionType;
  final int estimatedDuration;
  final List<TrainingExercise> exercises;
  final String difficulty;
  final String encouragement;

  TrainingSession({
    required this.sessionId,
    required this.sessionType,
    required this.estimatedDuration,
    required this.exercises,
    required this.difficulty,
    required this.encouragement,
  });

  factory TrainingSession.fromJson(Map<String, dynamic> json) {
    return TrainingSession(
      sessionId: json['sessionId'] ?? '',
      sessionType: json['sessionType'] ?? 'full',
      estimatedDuration: json['estimatedDuration'] ?? 10,
      exercises: (json['exercises'] as List?)
              ?.map((e) => TrainingExercise.fromJson(e))
              .toList() ??
          [],
      difficulty: json['difficulty'] ?? 'balanced',
      encouragement: json['encouragement'] ?? 'Let\'s exercise your memory!',
    );
  }

  factory TrainingSession.empty() {
    return TrainingSession(
      sessionId: '',
      sessionType: 'full',
      estimatedDuration: 0,
      exercises: [],
      difficulty: 'balanced',
      encouragement: '',
    );
  }

  bool get isEmpty => exercises.isEmpty;
}

/// Single training exercise
class TrainingExercise {
  final String exerciseId;
  final String personId;
  final String type;
  final String name;
  final String description;
  final int difficulty;
  final int timeLimit;
  final bool hintsAvailable;

  TrainingExercise({
    required this.exerciseId,
    required this.personId,
    required this.type,
    required this.name,
    required this.description,
    required this.difficulty,
    required this.timeLimit,
    required this.hintsAvailable,
  });

  factory TrainingExercise.fromJson(Map<String, dynamic> json) {
    return TrainingExercise(
      exerciseId: json['exercise_id'] ?? '',
      personId: json['person_id'] ?? '',
      type: json['type'] ?? 'face_match',
      name: json['name'] ?? 'Exercise',
      description: json['description'] ?? '',
      difficulty: json['difficulty'] ?? 3,
      timeLimit: json['time_limit'] ?? 30,
      hintsAvailable: json['hints_available'] ?? false,
    );
  }
}

/// Result of submitting an exercise
class TrainingResult {
  final double previousStrength;
  final double newStrength;
  final double strengthChange;
  final String nextReviewDate;
  final int streak;
  final String encouragement;

  TrainingResult({
    required this.previousStrength,
    required this.newStrength,
    required this.strengthChange,
    required this.nextReviewDate,
    required this.streak,
    required this.encouragement,
  });

  factory TrainingResult.fromJson(Map<String, dynamic> json) {
    return TrainingResult(
      previousStrength: (json['previousStrength'] ?? 0.0).toDouble(),
      newStrength: (json['newStrength'] ?? 0.0).toDouble(),
      strengthChange: (json['strengthChange'] ?? 0.0).toDouble(),
      nextReviewDate: json['nextReviewDate'] ?? '',
      streak: json['streak'] ?? 0,
      encouragement: json['encouragement'] ?? 'Great effort!',
    );
  }

  factory TrainingResult.empty() {
    return TrainingResult(
      previousStrength: 0.0,
      newStrength: 0.0,
      strengthChange: 0.0,
      nextReviewDate: '',
      streak: 0,
      encouragement: '',
    );
  }

  bool get improved => strengthChange > 0;
}

/// Overall training progress
class TrainingProgress {
  final int totalSessions;
  final int totalExercises;
  final double overallAccuracy;
  final int currentStreak;
  final int longestStreak;
  final List<String> strongestMemories;
  final List<String> needsReinforcement;
  final List<Achievement> achievements;

  TrainingProgress({
    required this.totalSessions,
    required this.totalExercises,
    required this.overallAccuracy,
    required this.currentStreak,
    required this.longestStreak,
    required this.strongestMemories,
    required this.needsReinforcement,
    required this.achievements,
  });

  factory TrainingProgress.fromJson(Map<String, dynamic> json) {
    return TrainingProgress(
      totalSessions: json['totalSessions'] ?? 0,
      totalExercises: json['totalExercises'] ?? 0,
      overallAccuracy: (json['overallAccuracy'] ?? 0.0).toDouble(),
      currentStreak: json['currentStreak'] ?? 0,
      longestStreak: json['longestStreak'] ?? 0,
      strongestMemories: List<String>.from(json['strongestMemories'] ?? []),
      needsReinforcement: List<String>.from(json['needsReinforcement'] ?? []),
      achievements: (json['achievements'] as List?)
              ?.map((a) => Achievement.fromJson(a))
              .toList() ??
          [],
    );
  }

  factory TrainingProgress.empty() {
    return TrainingProgress(
      totalSessions: 0,
      totalExercises: 0,
      overallAccuracy: 0.0,
      currentStreak: 0,
      longestStreak: 0,
      strongestMemories: [],
      needsReinforcement: [],
      achievements: [],
    );
  }
}

/// Achievement earned through training
class Achievement {
  final String name;
  final String icon;
  final String description;

  Achievement({
    required this.name,
    required this.icon,
    required this.description,
  });

  factory Achievement.fromJson(Map<String, dynamic> json) {
    return Achievement(
      name: json['name'] ?? '',
      icon: json['icon'] ?? '🎯',
      description: json['description'] ?? '',
    );
  }
}

/// Memory strength for a person
class RelationshipStrength {
  final String personId;
  final double strength;
  final String strengthLevel;
  final String lastReviewed;
  final String nextReview;

  RelationshipStrength({
    required this.personId,
    required this.strength,
    required this.strengthLevel,
    required this.lastReviewed,
    required this.nextReview,
  });

  factory RelationshipStrength.fromJson(Map<String, dynamic> json) {
    return RelationshipStrength(
      personId: json['personId'] ?? '',
      strength: (json['strength'] ?? 0.0).toDouble(),
      strengthLevel: json['strengthLevel'] ?? 'weak',
      lastReviewed: json['lastReviewed'] ?? '',
      nextReview: json['nextReview'] ?? '',
    );
  }

  bool get isStrong => strengthLevel == 'strong';
  bool get isWeak => strengthLevel == 'weak';
}
