class ApiConfig {
  static const String baseUrl = 'http://localhost:3000/api';
  static const String apiBaseUrl = 'http://localhost:3000'; // For service calls
  static const String mlServiceUrl = 'http://localhost:8000';

  static const Duration timeout = Duration(seconds: 30);

  static const Map<String, String> headers = {
    'Content-Type': 'application/json',
  };

  static Map<String, String> authHeaders(String token) {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }
}
