import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';

class SOSScreen extends StatefulWidget {
  const SOSScreen({super.key});

  @override
  State<SOSScreen> createState() => _SOSScreenState();
}

class _SOSScreenState extends State<SOSScreen> {
  bool _isLoading = false;
  bool _sosTriggered = false;
  Map<String, dynamic>? _directions;

  Future<void> _triggerSOS() async {
    setState(() => _isLoading = true);
    
    final locationService = Provider.of<LocationService>(context, listen: false);
    final position = await locationService.getCurrentLocation();
    
    if (position == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not get location')),
      );
      setState(() => _isLoading = false);
      return;
    }
    
    final apiService = Provider.of<ApiService>(context, listen: false);
    final success = await apiService.triggerSOS(position.latitude, position.longitude, message: 'Emergency SOS Alert');
    
    setState(() {
      _isLoading = false;
      _sosTriggered = success;
    });
    
    if (success) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: Colors.green, size: 48),
          title: const Text('SOS Sent'),
          content: const Text('Your emergency contacts have been notified with your location.'),
          actions: [FilledButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))],
        ),
      );
    }
  }

  Future<void> _navigateHome() async {
    setState(() => _isLoading = true);
    
    final locationService = Provider.of<LocationService>(context, listen: false);
    final position = await locationService.getCurrentLocation();
    
    if (position == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not get location')));
      setState(() => _isLoading = false);
      return;
    }
    
    final apiService = Provider.of<ApiService>(context, listen: false);
    final directions = await apiService.getDirectionsHome(position.latitude, position.longitude);
    
    setState(() {
      _isLoading = false;
      _directions = directions;
    });
    
    if (directions != null && directions['routes']?.isNotEmpty == true) {
      final route = directions['routes'][0];
      final leg = route['legs']?[0];
      
      showModalBottomSheet(
        context: context,
        builder: (context) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.home, size: 48, color: Colors.green),
              const SizedBox(height: 16),
              Text('Directions to Home', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text('Distance: ${leg?['distance']?['text'] ?? 'Unknown'}'),
              Text('Duration: ${leg?['duration']?['text'] ?? 'Unknown'}'),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: () {
                  final url = 'google.navigation:q=${leg?['end_location']?['lat']},${leg?['end_location']?['lng']}&mode=w';
                  launchUrl(Uri.parse(url));
                },
                icon: const Icon(Icons.navigation),
                label: const Text('Open in Google Maps'),
              ),
            ],
          ),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Home location not set')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Emergency & Navigation')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Card(
                color: Colors.red.shade50,
                child: InkWell(
                  onTap: _isLoading ? null : _triggerSOS,
                  borderRadius: BorderRadius.circular(12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.sos, size: 80, color: Colors.red.shade700),
                      const SizedBox(height: 16),
                      Text('EMERGENCY SOS',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.red.shade700)),
                      const SizedBox(height: 8),
                      Text('Tap to alert emergency contacts',
                        style: TextStyle(color: Colors.red.shade600)),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Expanded(
              child: Card(
                color: Colors.green.shade50,
                child: InkWell(
                  onTap: _isLoading ? null : _navigateHome,
                  borderRadius: BorderRadius.circular(12),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.home, size: 80, color: Colors.green.shade700),
                      const SizedBox(height: 16),
                      Text('TAKE ME HOME',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.green.shade700)),
                      const SizedBox(height: 8),
                      Text('Get directions to your home',
                        style: TextStyle(color: Colors.green.shade600)),
                    ],
                  ),
                ),
              ),
            ),
            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              ),
          ],
        ),
      ),
    );
  }
}
