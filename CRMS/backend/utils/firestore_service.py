"""Firestore CRUD service with automatic timestamp management"""
from typing import Type, TypeVar, List, Optional, Dict, Any
from datetime import datetime
from firebase_admin import firestore
from utils.firebase import get_db
from models.base import BaseModel

T = TypeVar("T", bound=BaseModel)


class FirestoreService:
    """Generic Firestore service for CRUD operations"""
    
    def __init__(self, collection_name: str):
        self.db = get_db()
        self.collection = self.db.collection(collection_name)

    # ✅ Create / Add
    def create(self, model: T) -> str:
        """Add a new document with automatic timestamps"""
        model.update_timestamps(is_new=True)
        data = model.to_dict()
        doc_ref = self.collection.add(data)[1]
        model.id = doc_ref.id
        return model.id

    # ✅ Read (get single)
    def get(self, doc_id: str, model_class: Type[T]) -> Optional[T]:
        """Get a document by ID"""
        doc = self.collection.document(doc_id).get()
        if not doc.exists:
            return None
        return model_class.from_dict(doc.id, doc.to_dict())

    # ✅ Read (get all)
    def list_all(self, model_class: Type[T]) -> List[T]:
        """List all documents"""
        docs = self.collection.stream()
        return [model_class.from_dict(doc.id, doc.to_dict()) for doc in docs]

    # ✅ Update
    def update(self, doc_id: str, updates: Dict[str, Any]):
        """Update document with automatic timestamp"""
        updates["updated_at"] = datetime.utcnow()
        self.collection.document(doc_id).update(updates)
        return True

    # ✅ Delete
    def delete(self, doc_id: str):
        """Delete a document"""
        self.collection.document(doc_id).delete()
        return True
