import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../models/reminder.dart';

class RemindersScreen extends StatefulWidget {
  const RemindersScreen({super.key});

  @override
  State<RemindersScreen> createState() => _RemindersScreenState();
}

class _RemindersScreenState extends State<RemindersScreen> {
  List<Reminder> _reminders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadReminders();
  }

  Future<void> _loadReminders() async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    final reminders = await apiService.getReminders();
    setState(() {
      _reminders = reminders;
      _isLoading = false;
    });
  }

  void _showAddReminderDialog() {
    final nameController = TextEditingController();
    final doseController = TextEditingController();
    TimeOfDay selectedTime = TimeOfDay.now();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add Medicine Reminder'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Medicine Name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: doseController,
                decoration: const InputDecoration(labelText: 'Dosage (e.g., 10mg)'),
              ),
              const SizedBox(height: 12),
              ListTile(
                title: const Text('Time'),
                trailing: Text(selectedTime.format(context)),
                onTap: () async {
                  final time = await showTimePicker(context: context, initialTime: selectedTime);
                  if (time != null) setDialogState(() => selectedTime = time);
                },
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                if (nameController.text.isEmpty) return;
                final timeStr = '${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}';
                final apiService = Provider.of<ApiService>(context, listen: false);
                await apiService.createReminder('medicine', timeStr,
                  medicineName: nameController.text, dose: doseController.text,
                  description: 'Take ${nameController.text}');
                Navigator.pop(context);
                _loadReminders();
              },
              child: const Text('Add'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Medicine Reminders')),
      body: _isLoading
        ? const Center(child: CircularProgressIndicator())
        : _reminders.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.medication_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No reminders yet'),
                  const SizedBox(height: 8),
                  FilledButton(onPressed: _showAddReminderDialog, child: const Text('Add Reminder')),
                ],
              ),
            )
          : ListView.builder(
              itemCount: _reminders.length,
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) {
                final reminder = _reminders[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: reminder.isActive ? Colors.green : Colors.grey,
                      child: const Icon(Icons.medication, color: Colors.white),
                    ),
                    title: Text(reminder.medicineName ?? reminder.description),
                    subtitle: Text('${reminder.displayTime} - ${reminder.dose ?? ''}'),
                    trailing: Switch(
                      value: reminder.isActive,
                      onChanged: (v) {},
                    ),
                  ),
                );
              },
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddReminderDialog,
        icon: const Icon(Icons.add),
        label: const Text('Add'),
      ),
    );
  }
}
