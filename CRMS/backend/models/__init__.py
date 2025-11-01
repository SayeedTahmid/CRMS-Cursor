"""Data models for the CRM system"""
from models.customer import Customer
from models.log import Log
from models.complaint import Complaint
from models.user import User

__all__ = ['Customer', 'Log', 'Complaint', 'User']


