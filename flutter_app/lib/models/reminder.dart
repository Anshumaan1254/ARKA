class Reminder {
  final String id;
  final String userId;
  final String type;
  final String time;
  final String? medicineName;
  final String? dose;
  final String description;
  final List<int> repeatDays;
  final String? personId;
  final bool isActive;
  final DateTime? lastTriggered;
  final DateTime createdAt;

  Reminder({
    required this.id, required this.userId, required this.type, required this.time,
    this.medicineName, this.dose, required this.description, this.repeatDays = const [0,1,2,3,4,5,6],
    this.personId, this.isActive = true, this.lastTriggered, required this.createdAt,
  });

  factory Reminder.fromJson(Map<String, dynamic> json) => Reminder(
    id: json['id'] ?? '', userId: json['userId'] ?? '', type: json['type'] ?? 'medicine',
    time: json['time'] ?? '', medicineName: json['medicineName'], dose: json['dose'],
    description: json['description'] ?? '', repeatDays: List<int>.from(json['repeatDays'] ?? [0,1,2,3,4,5,6]),
    personId: json['personId'], isActive: json['isActive'] ?? true,
    lastTriggered: json['lastTriggered'] != null ? DateTime.parse(json['lastTriggered']) : null,
    createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
  );

  Map<String, dynamic> toJson() => {
    'id': id, 'userId': userId, 'type': type, 'time': time, 'medicineName': medicineName,
    'dose': dose, 'description': description, 'repeatDays': repeatDays, 'personId': personId,
    'isActive': isActive, 'lastTriggered': lastTriggered?.toIso8601String(), 'createdAt': createdAt.toIso8601String(),
  };

  String get displayTime {
    final parts = time.split(':');
    if (parts.length != 2) return time;
    int hour = int.tryParse(parts[0]) ?? 0;
    final minute = parts[1];
    final period = hour >= 12 ? 'PM' : 'AM';
    if (hour > 12) hour -= 12;
    if (hour == 0) hour = 12;
    return '$hour:$minute $period';
  }
}
