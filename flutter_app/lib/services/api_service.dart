import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';
import '../models/person.dart';
import '../models/reminder.dart';

class ApiService extends ChangeNotifier {
  String? _token;
  
  void setToken(String token) {
    _token = token;
    notifyListeners();
  }

  Map<String, String> get _headers => _token != null 
    ? ApiConfig.authHeaders(_token!) 
    : ApiConfig.headers;

  Future<List<Person>> getPersons() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/persons'),
        headers: _headers,
      ).timeout(ApiConfig.timeout);
      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        return data.map((p) => Person.fromJson(p)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<Person?> createPerson(String name, String relation, {String? voiceDescription}) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/persons'),
        headers: _headers,
        body: jsonEncode({'name': name, 'relation': relation, 'voiceDescription': voiceDescription}),
      ).timeout(ApiConfig.timeout);
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return Person.fromJson(data['person']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> recognizePerson(String imageBase64) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/persons/recognize'),
        headers: _headers,
        body: jsonEncode({'imageBase64': imageBase64}),
      ).timeout(ApiConfig.timeout);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<List<Reminder>> getReminders() async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/reminders'),
        headers: _headers,
      ).timeout(ApiConfig.timeout);
      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        return data.map((r) => Reminder.fromJson(r)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<bool> createReminder(String type, String time, {String? medicineName, String? dose, String? description}) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/reminders'),
        headers: _headers,
        body: jsonEncode({'type': type, 'time': time, 'medicineName': medicineName, 'dose': dose, 'description': description}),
      ).timeout(ApiConfig.timeout);
      return response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  Future<bool> triggerSOS(double lat, double long, {String? message}) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/sos/alert'),
        headers: _headers,
        body: jsonEncode({'lat': lat, 'long': long, 'message': message}),
      ).timeout(ApiConfig.timeout);
      return response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  Future<Map<String, dynamic>?> getDirectionsHome(double lat, double long) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/sos/navigate-home'),
        headers: _headers,
        body: jsonEncode({'lat': lat, 'long': long}),
      ).timeout(ApiConfig.timeout);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> processFrame(String frameBase64, double? lat, double? long) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/frame/process'),
        headers: _headers,
        body: jsonEncode({'frameBase64': frameBase64, 'lat': lat, 'long': long}),
      ).timeout(ApiConfig.timeout);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>?> parseVoiceCommand(String text) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.mlServiceUrl}/voice/parse-command'),
        headers: ApiConfig.headers,
        body: jsonEncode({'text': text}),
      ).timeout(ApiConfig.timeout);
      if (response.statusCode == 200) return jsonDecode(response.body);
      return null;
    } catch (e) {
      return null;
    }
  }
}
