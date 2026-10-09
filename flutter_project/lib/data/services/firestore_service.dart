import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/diary_entry_model.dart';

final firestoreServiceProvider = Provider<FirestoreService>((ref) {
  return FirestoreService();
});

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String collectionName = 'diary_entries';

  CollectionReference<Map<String, dynamic>> get _collection =>
      _firestore.collection(collectionName);

  Future<String> createEntry(DiaryEntry entry) async {
    final docRef = await _collection.add(entry.toMap());
    return docRef.id;
  }

  Stream<List<DiaryEntry>> getMyEntriesStream(String userId) {
    return _collection
        .where('user_id', isEqualTo: userId)
        .orderBy('created_at', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => DiaryEntry.fromFirestore(doc)).toList());
  }

  Stream<List<DiaryEntry>> getSharedWithMeEntriesStream(String userEmail) {
    return _collection
        .where('shared_with', isEqualTo: userEmail.trim().toLowerCase())
        .orderBy('created_at', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => DiaryEntry.fromFirestore(doc)).toList());
  }
}
