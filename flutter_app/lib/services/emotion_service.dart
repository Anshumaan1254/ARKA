import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

/// EmotionService - Real-time emotion detection and adaptive UI
class EmotionService {
  static const String baseUrl = ApiConfig.mlServiceUrl;

  /// Analyze face for emotions
  static Future<EmotionResult> analyzeFace({
    required String imageBase64,
    Map<String, dynamic>? context,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/emotion/analyze-face'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'image_base64': imageBase64,
          'context': context ?? {},
        }),
      );

      if (response.statusCode == 200) {
        return EmotionResult.fromJson(jsonDecode(response.body));
      }
      throw Exception('Failed to analyze emotion: ${response.statusCode}');
    } catch (e) {
      print('Emotion analysis error: $e');
      return EmotionResult.neutral();
    }
  }

  /// Get adaptive UI response based on emotion
  static Future<AdaptiveUIConfig> getAdaptiveResponse({
    required String currentEmotion,
    Map<String, dynamic>? context,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/emotion/adaptive-response'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'current_emotion': currentEmotion,
          'context': context ?? {},
        }),
      );

      if (response.statusCode == 200) {
        return AdaptiveUIConfig.fromJson(jsonDecode(response.body));
      }
      throw Exception('Failed to get adaptive response');
    } catch (e) {
      print('Adaptive response error: $e');
      return AdaptiveUIConfig.defaultConfig();
    }
  }
}

/// Result of emotion analysis
class EmotionResult {
  final String dominantEmotion;
  final double confidence;
  final Map<String, double> allEmotions;
  final double confusionLevel;
  final double stressLevel;
  final bool needsIntervention;
  final String suggestedResponse;

  EmotionResult({
    required this.dominantEmotion,
    required this.confidence,
    required this.allEmotions,
    required this.confusionLevel,
    required this.stressLevel,
    required this.needsIntervention,
    required this.suggestedResponse,
  });

  factory EmotionResult.fromJson(Map<String, dynamic> json) {
    return EmotionResult(
      dominantEmotion: json['dominant_emotion'] ?? 'neutral',
      confidence: (json['confidence'] ?? 0.5).toDouble(),
      allEmotions: Map<String, double>.from((json['all_emotions'] ?? {})
          .map((k, v) => MapEntry(k, v.toDouble()))),
      confusionLevel: (json['confusion_level'] ?? 0.0).toDouble(),
      stressLevel: (json['stress_level'] ?? 0.0).toDouble(),
      needsIntervention: json['needs_intervention'] ?? false,
      suggestedResponse: json['suggested_response'] ?? '',
    );
  }

  factory EmotionResult.neutral() {
    return EmotionResult(
      dominantEmotion: 'neutral',
      confidence: 0.5,
      allEmotions: {'neutral': 0.5},
      confusionLevel: 0.0,
      stressLevel: 0.0,
      needsIntervention: false,
      suggestedResponse: 'Hello! How can I help you today?',
    );
  }

  bool get isDistressed => confusionLevel > 0.6 || stressLevel > 0.7;
  bool get isHappy => dominantEmotion == 'happy' && confidence > 0.6;
}

/// Adaptive UI configuration based on emotional state
class AdaptiveUIConfig {
  final String uiTheme;
  final Map<String, String> colorScheme;
  final String fontSize;
  final String animationSpeed;
  final String voiceTone;
  final List<String> suggestedActions;

  AdaptiveUIConfig({
    required this.uiTheme,
    required this.colorScheme,
    required this.fontSize,
    required this.animationSpeed,
    required this.voiceTone,
    required this.suggestedActions,
  });

  factory AdaptiveUIConfig.fromJson(Map<String, dynamic> json) {
    return AdaptiveUIConfig(
      uiTheme: json['ui_theme'] ?? 'default',
      colorScheme: Map<String, String>.from(json['color_scheme'] ?? {}),
      fontSize: json['font_size'] ?? 'normal',
      animationSpeed: json['animation_speed'] ?? 'normal',
      voiceTone: json['voice_tone'] ?? 'friendly',
      suggestedActions: List<String>.from(json['suggested_actions'] ?? []),
    );
  }

  factory AdaptiveUIConfig.defaultConfig() {
    return AdaptiveUIConfig(
      uiTheme: 'default',
      colorScheme: {'primary': '#3F51B5', 'background': '#E8EAF6'},
      fontSize: 'normal',
      animationSpeed: 'normal',
      voiceTone: 'friendly',
      suggestedActions: ['Check reminders', 'Start training'],
    );
  }

  /// Get calming colors for distressed state
  factory AdaptiveUIConfig.calming() {
    return AdaptiveUIConfig(
      uiTheme: 'calming',
      colorScheme: {'primary': '#9C27B0', 'background': '#F3E5F5'},
      fontSize: 'larger',
      animationSpeed: 'slow',
      voiceTone: 'soothing',
      suggestedActions: ['View photos', 'Listen to music', 'Call family'],
    );
  }
}
