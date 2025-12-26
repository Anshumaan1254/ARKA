class Person {
  final String id;
  final String userId;
  final String name;
  final String relation;
  final String? azureFacePersonId;
  final String? voiceDescription;
  final List<Memory> memories;
  final LastSeen? lastSeen;
  final List<MedicineSchedule> medicineSchedule;
  final List<String> sosContacts;
  final DateTime createdAt;
  final DateTime updatedAt;

  Person({
    required this.id,
    required this.userId,
    required this.name,
    required this.relation,
    this.azureFacePersonId,
    this.voiceDescription,
    this.memories = const [],
    this.lastSeen,
    this.medicineSchedule = const [],
    this.sosContacts = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory Person.fromJson(Map<String, dynamic> json) {
    return Person(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      name: json['name'] ?? '',
      relation: json['relation'] ?? '',
      azureFacePersonId: json['azureFacePersonId'],
      voiceDescription: json['voiceDescription'],
      memories: (json['memories'] as List?)?.map((m) => Memory.fromJson(m)).toList() ?? [],
      lastSeen: json['lastSeen'] != null ? LastSeen.fromJson(json['lastSeen']) : null,
      medicineSchedule: (json['medicineSchedule'] as List?)?.map((m) => MedicineSchedule.fromJson(m)).toList() ?? [],
      sosContacts: List<String>.from(json['sosContacts'] ?? []),
      createdAt: DateTime.parse(json['createdAt'] ?? DateTime.now().toIso8601String()),
      updatedAt: DateTime.parse(json['updatedAt'] ?? DateTime.now().toIso8601String()),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id, 'userId': userId, 'name': name, 'relation': relation,
    'azureFacePersonId': azureFacePersonId, 'voiceDescription': voiceDescription,
    'memories': memories.map((m) => m.toJson()).toList(),
    'lastSeen': lastSeen?.toJson(),
    'medicineSchedule': medicineSchedule.map((m) => m.toJson()).toList(),
    'sosContacts': sosContacts,
    'createdAt': createdAt.toIso8601String(), 'updatedAt': updatedAt.toIso8601String(),
  };
}

class Memory {
  final String id;
  final String type;
  final String? url;
  final String description;

  Memory({required this.id, required this.type, this.url, required this.description});

  factory Memory.fromJson(Map<String, dynamic> json) => Memory(
    id: json['id'] ?? '', type: json['type'] ?? 'text',
    url: json['url'], description: json['description'] ?? '',
  );

  Map<String, dynamic> toJson() => {'id': id, 'type': type, 'url': url, 'description': description};
}

class LastSeen {
  final DateTime date;
  final Location? location;
  final String? imageUrl;
  final double confidence;

  LastSeen({required this.date, this.location, this.imageUrl, required this.confidence});

  factory LastSeen.fromJson(Map<String, dynamic> json) => LastSeen(
    date: DateTime.parse(json['date']),
    location: json['location'] != null ? Location.fromJson(json['location']) : null,
    imageUrl: json['imageUrl'], confidence: (json['confidence'] ?? 0).toDouble(),
  );

  Map<String, dynamic> toJson() => {
    'date': date.toIso8601String(), 'location': location?.toJson(),
    'imageUrl': imageUrl, 'confidence': confidence,
  };
}

class Location {
  final double lat;
  final double long;

  Location({required this.lat, required this.long});

  factory Location.fromJson(Map<String, dynamic> json) => Location(
    lat: (json['lat'] ?? 0).toDouble(), long: (json['long'] ?? 0).toDouble(),
  );

  Map<String, dynamic> toJson() => {'lat': lat, 'long': long};
}

class MedicineSchedule {
  final String name;
  final String time;
  final String dose;

  MedicineSchedule({required this.name, required this.time, required this.dose});

  factory MedicineSchedule.fromJson(Map<String, dynamic> json) => MedicineSchedule(
    name: json['name'] ?? '', time: json['time'] ?? '', dose: json['dose'] ?? '',
  );

  Map<String, dynamic> toJson() => {'name': name, 'time': time, 'dose': dose};
}
