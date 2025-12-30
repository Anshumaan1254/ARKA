import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// CognitiveService - Cognitive health monitoring and analysis
class CognitiveService {
  static const String baseUrl = ApiConfig.apiBaseUrl;

  /// Analyze speech for cognitive indicators
  static Future<SpeechAnalysisResult> analyzeSpeech({
    required String userId,
    String? audioBase64,
    String? transcript,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/cognitive/analyze-speech'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'audioBase64': audioBase64,
          'transcript': transcript,
        }),
      );

      if (response.statusCode == 200) {
        return SpeechAnalysisResult.fromJson(jsonDecode(response.body));
      }
      throw Exception('Speech analysis failed');
    } catch (e) {
      print('Speech analysis error: $e');
      return SpeechAnalysisResult.empty();
    }
  }

  /// Submit daily cognitive score
  static Future<DailyScoreResult> submitDailyScore({
    required String userId,
    required List<Map<String, dynamic>> activities,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/cognitive/daily-score'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'activities': activities,
        }),
      );

      if (response.statusCode == 200) {
        return DailyScoreResult.fromJson(jsonDecode(response.body));
      }
      throw Exception('Daily score submission failed');
    } catch (e) {
      print('Daily score error: $e');
      return DailyScoreResult.empty();
    }
  }

  /// Get cognitive trends
  static Future<CognitiveTrends> getTrends({
    required String userId,
    int days = 30,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/cognitive/trends/$userId?days=$days'),
      );

      if (response.statusCode == 200) {
        return CognitiveTrends.fromJson(jsonDecode(response.body));
      }
      throw Exception('Trends fetch failed');
    } catch (e) {
      print('Trends error: $e');
      return CognitiveTrends.empty();
    }
  }

  /// Log user interaction for analysis
  static Future<bool> logInteraction({
    required String userId,
    required String interactionType,
    required bool success,
    int? duration,
    Map<String, dynamic>? details,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/cognitive/interaction-log'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': userId,
          'interactionType': interactionType,
          'success': success,
          'duration': duration,
          'details': details,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Interaction log error: $e');
      return false;
    }
  }
}

/// Speech analysis result
class SpeechAnalysisResult {
  final double cognitiveScore;
  final double hesitationScore;
  final double repetitionScore;
  final double wordFindingDifficulty;
  final String alertLevel;
  final List<String> recommendations;

  SpeechAnalysisResult({
    required this.cognitiveScore,
    required this.hesitationScore,
    required this.repetitionScore,
    required this.wordFindingDifficulty,
    required this.alertLevel,
    required this.recommendations,
  });

  factory SpeechAnalysisResult.fromJson(Map<String, dynamic> json) {
    final indicators = json['indicators'] ?? {};
    return SpeechAnalysisResult(
      cognitiveScore: (json['cognitiveScore'] ?? 0.75).toDouble(),
      hesitationScore: (indicators['hesitationScore'] ?? 0.0).toDouble(),
      repetitionScore: (indicators['repetitionScore'] ?? 0.0).toDouble(),
      wordFindingDifficulty:
          (indicators['wordFindingDifficulty'] ?? 0.0).toDouble(),
      alertLevel: json['alertLevel'] ?? 'normal',
      recommendations: List<String>.from(json['recommendations'] ?? []),
    );
  }

  factory SpeechAnalysisResult.empty() {
    return SpeechAnalysisResult(
      cognitiveScore: 0.75,
      hesitationScore: 0.0,
      repetitionScore: 0.0,
      wordFindingDifficulty: 0.0,
      alertLevel: 'normal',
      recommendations: [],
    );
  }

  bool get needsAttention => alertLevel == 'high' || alertLevel == 'moderate';
}

/// Daily cognitive score result
class DailyScoreResult {
  final double score;
  final Map<String, double> breakdown;
  final String trend;
  final List<String> insights;

  DailyScoreResult({
    required this.score,
    required this.breakdown,
    required this.trend,
    required this.insights,
  });

  factory DailyScoreResult.fromJson(Map<String, dynamic> json) {
    return DailyScoreResult(
      score: (json['score'] ?? 0.5).toDouble(),
      breakdown: Map<String, double>.from(
          (json['breakdown'] ?? {}).map((k, v) => MapEntry(k, v.toDouble()))),
      trend: json['trend'] ?? 'stable',
      insights: List<String>.from(json['insights'] ?? []),
    );
  }

  factory DailyScoreResult.empty() {
    return DailyScoreResult(
      score: 0.5,
      breakdown: {},
      trend: 'unknown',
      insights: [],
    );
  }
}

/// Cognitive trends over time
class CognitiveTrends {
  final List<Map<String, dynamic>> trends;
  final double averageScore;
  final String trajectory;
  final List<String> recommendations;

  CognitiveTrends({
    required this.trends,
    required this.averageScore,
    required this.trajectory,
    required this.recommendations,
  });

  factory CognitiveTrends.fromJson(Map<String, dynamic> json) {
    return CognitiveTrends(
      trends: List<Map<String, dynamic>>.from(json['trends'] ?? []),
      averageScore: (json['averageScore'] ?? 0.65).toDouble(),
      trajectory: json['trajectory'] ?? 'stable',
      recommendations: List<String>.from(json['recommendations'] ?? []),
    );
  }

  factory CognitiveTrends.empty() {
    return CognitiveTrends(
      trends: [],
      averageScore: 0.65,
      trajectory: 'unknown',
      recommendations: [],
    );
  }

  bool get isImproving => trajectory == 'improving';
  bool get isDeclining => trajectory == 'declining';
}
