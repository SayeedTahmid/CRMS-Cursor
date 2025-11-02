"""User service for Firestore operations"""
from models.user import User
from utils.firestore_service import FirestoreService


class UserService(FirestoreService):
    def __init__(self):
        super().__init__("users")

    def create_user(self, user: User) -> str:
        return self.create(user)

    def get_user(self, user_id: str) -> User:
        return self.get(user_id, User)

    def list_users(self):
        return self.list_all(User)

    def update_user(self, user_id: str, updates: dict):
        return self.update(user_id, updates)

    def delete_user(self, user_id: str):
        return self.delete(user_id)
