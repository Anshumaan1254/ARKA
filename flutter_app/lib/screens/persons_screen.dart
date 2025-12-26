import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/person.dart';

class PersonsScreen extends StatefulWidget {
  const PersonsScreen({super.key});

  @override
  State<PersonsScreen> createState() => _PersonsScreenState();
}

class _PersonsScreenState extends State<PersonsScreen> {
  List<Person> _persons = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPersons();
  }

  Future<void> _loadPersons() async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    final persons = await apiService.getPersons();
    setState(() { _persons = persons; _isLoading = false; });
  }

  void _showAddPersonDialog() {
    final nameController = TextEditingController();
    final relationController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Person'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Name')),
            const SizedBox(height: 12),
            TextField(controller: relationController, decoration: const InputDecoration(labelText: 'Relation (e.g., Son, Daughter)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (nameController.text.isEmpty || relationController.text.isEmpty) return;
              final apiService = Provider.of<ApiService>(context, listen: false);
              await apiService.createPerson(nameController.text, relationController.text);
              Navigator.pop(context);
              _loadPersons();
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showPersonDetails(Person person) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: CircleAvatar(radius: 40, child: Text(person.name[0], style: const TextStyle(fontSize: 32)))),
              const SizedBox(height: 16),
              Center(child: Text(person.name, style: Theme.of(context).textTheme.headlineSmall)),
              Center(child: Text(person.relation, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.grey))),
              const SizedBox(height: 24),
              if (person.lastSeen != null) ...[
                Text('Last Seen', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                Card(child: ListTile(
                  leading: const Icon(Icons.access_time),
                  title: Text(_formatDate(person.lastSeen!.date)),
                  subtitle: person.lastSeen!.location != null
                    ? Text('${person.lastSeen!.location!.lat.toStringAsFixed(4)}, ${person.lastSeen!.location!.long.toStringAsFixed(4)}')
                    : null,
                )),
                const SizedBox(height: 16),
              ],
              Text('Memories (${person.memories.length})', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (person.memories.isEmpty)
                const Card(child: ListTile(title: Text('No memories yet')))
              else
                ...person.memories.map((m) => Card(child: ListTile(
                  leading: Icon(m.type == 'audio' ? Icons.audiotrack : m.type == 'video' ? Icons.videocam : Icons.image),
                  title: Text(m.description.isNotEmpty ? m.description : 'Memory'),
                  trailing: const Icon(Icons.play_arrow),
                ))),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('People')),
      body: _isLoading
        ? const Center(child: CircularProgressIndicator())
        : _persons.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.people_outline, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No people added yet'),
                  const SizedBox(height: 8),
                  FilledButton(onPressed: _showAddPersonDialog, child: const Text('Add Person')),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _persons.length,
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) {
                final person = _persons[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: CircleAvatar(child: Text(person.name[0])),
                    title: Text(person.name),
                    subtitle: Text(person.relation),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _showPersonDetails(person),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddPersonDialog,
        icon: const Icon(Icons.person_add),
        label: const Text('Add'),
      ),
    );
  }
}
