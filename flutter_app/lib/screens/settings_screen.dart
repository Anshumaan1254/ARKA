import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  double _confidenceThreshold = 0.8;
  int _geofenceRadius = 500;
  bool _isSettingHome = false;

  Future<void> _setHomeLocation() async {
    setState(() => _isSettingHome = true);
    final locationService = Provider.of<LocationService>(context, listen: false);
    final position = await locationService.getCurrentLocation();
    setState(() => _isSettingHome = false);
    
    if (position != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Home set to: ${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}'),
      ));
    }
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Logout')),
        ],
      ),
    );
    
    if (confirm == true) {
      final authService = Provider.of<AuthService>(context, listen: false);
      await authService.logout();
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          _buildSection('Profile', [
            ListTile(
              leading: CircleAvatar(child: Text(authService.user?['name']?[0] ?? 'U')),
              title: Text(authService.user?['name'] ?? 'User'),
              subtitle: Text(authService.user?['email'] ?? ''),
            ),
          ]),
          _buildSection('Recognition Settings', [
            ListTile(
              title: const Text('Confidence Threshold'),
              subtitle: Text('${(_confidenceThreshold * 100).toInt()}%'),
              trailing: SizedBox(
                width: 150,
                child: Slider(
                  value: _confidenceThreshold,
                  min: 0.5, max: 1.0,
                  divisions: 10,
                  onChanged: (v) => setState(() => _confidenceThreshold = v),
                ),
              ),
            ),
          ]),
          _buildSection('Safety Settings', [
            ListTile(
              leading: const Icon(Icons.home),
              title: const Text('Set Home Location'),
              subtitle: const Text('Used for geofencing and navigation'),
              trailing: _isSettingHome ? const CircularProgressIndicator() : const Icon(Icons.chevron_right),
              onTap: _isSettingHome ? null : _setHomeLocation,
            ),
            ListTile(
              title: const Text('Geofence Radius'),
              subtitle: Text('$_geofenceRadius meters'),
              trailing: SizedBox(
                width: 150,
                child: Slider(
                  value: _geofenceRadius.toDouble(),
                  min: 100, max: 2000,
                  divisions: 19,
                  onChanged: (v) => setState(() => _geofenceRadius = v.toInt()),
                ),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.contacts),
              title: const Text('Emergency Contacts'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ]),
          _buildSection('Account', [
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Logout', style: TextStyle(color: Colors.red)),
              onTap: _logout,
            ),
          ]),
          const SizedBox(height: 24),
          Center(child: Text('Version 1.0.0', style: Theme.of(context).textTheme.bodySmall)),
        ],
      ),
    );
  }

  Widget _buildSection(String title, List<Widget> children) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Theme.of(context).colorScheme.primary)),
        ),
        ...children,
        const Divider(),
      ],
    );
  }
}
