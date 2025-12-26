import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  final List<_NavItem> _items = [
    _NavItem(icon: Icons.home, label: 'Home'),
    _NavItem(icon: Icons.camera_alt, label: 'Recognize'),
    _NavItem(icon: Icons.medication, label: 'Medicine'),
    _NavItem(icon: Icons.sos, label: 'SOS'),
  ];

  @override
  void initState() {
    super.initState();
    final authService = Provider.of<AuthService>(context, listen: false);
    final apiService = Provider.of<ApiService>(context, listen: false);
    if (authService.token != null) apiService.setToken(authService.token!);
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Hi, ${authService.user?['name'] ?? 'Friend'}!'),
        actions: [
          IconButton(
            icon: const Icon(Icons.people),
            onPressed: () => Navigator.pushNamed(context, '/persons'),
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => Navigator.pushNamed(context, '/settings'),
          ),
        ],
      ),
      body: _buildBody(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) {
          if (i == 1) Navigator.pushNamed(context, '/camera');
          else if (i == 2) Navigator.pushNamed(context, '/reminders');
          else if (i == 3) Navigator.pushNamed(context, '/sos');
          else setState(() => _selectedIndex = i);
        },
        destinations: _items.map((item) => NavigationDestination(
          icon: Icon(item.icon),
          label: item.label,
        )).toList(),
      ),
    );
  }

  Widget _buildBody() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildQuickActions(),
          const SizedBox(height: 24),
          _buildFeatureCards(),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Quick Actions', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _QuickActionButton(
                  icon: Icons.camera_alt, label: 'Recognize Person',
                  color: Colors.blue, onTap: () => Navigator.pushNamed(context, '/camera'),
                )),
                const SizedBox(width: 12),
                Expanded(child: _QuickActionButton(
                  icon: Icons.sos, label: 'Emergency SOS',
                  color: Colors.red, onTap: () => Navigator.pushNamed(context, '/sos'),
                )),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: _QuickActionButton(
                  icon: Icons.home, label: 'Navigate Home',
                  color: Colors.green, onTap: () => Navigator.pushNamed(context, '/sos'),
                )),
                const SizedBox(width: 12),
                Expanded(child: _QuickActionButton(
                  icon: Icons.medication, label: 'Medicine',
                  color: Colors.orange, onTap: () => Navigator.pushNamed(context, '/reminders'),
                )),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureCards() {
    return Column(
      children: [
        _FeatureCard(
          icon: Icons.face, title: 'Face Recognition',
          description: 'Point camera at someone to recognize them and see memories',
          onTap: () => Navigator.pushNamed(context, '/camera'),
        ),
        _FeatureCard(
          icon: Icons.mic, title: 'Voice Commands',
          description: 'Say "Recognize him" or "Who is this?" to identify people',
          onTap: () => Navigator.pushNamed(context, '/camera'),
        ),
        _FeatureCard(
          icon: Icons.search, title: 'Find Items',
          description: 'Track where you last saw your keys, wallet, or remote',
          onTap: () {},
        ),
      ],
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  _NavItem({required this.icon, required this.label});
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickActionButton({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 32),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final VoidCallback onTap;

  const _FeatureCard({required this.icon, required this.title, required this.description, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(child: Icon(icon)),
        title: Text(title),
        subtitle: Text(description),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
