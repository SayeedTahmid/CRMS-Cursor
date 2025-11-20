# backend/services/taiga_service.py
"""Taiga API service for issue management"""
import os
import requests
from typing import Optional, Dict, Any, List
from datetime import datetime


class TaigaService:
    """Service for interacting with Taiga API"""
    
    def __init__(self):
        self.base_url = os.getenv('TAIGA_API_URL', 'https://api.taiga.io/api/v1')
        self.auth_token = os.getenv('TAIGA_AUTH_TOKEN', '')
        self.project_slug = os.getenv('TAIGA_PROJECT_SLUG', '')
        
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for Taiga API requests"""
        headers = {
            'Content-Type': 'application/json',
        }
        if self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
        return headers
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make a request to Taiga API"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = self._get_headers()
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, headers=headers, json=data, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            # Preserve HTTP error information
            error_info = {
                'status_code': e.response.status_code if hasattr(e, 'response') and e.response else None,
                'message': str(e),
            }
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    # Taiga uses _error_message and _error_type fields
                    error_info['detail'] = error_data.get('_error_message') or error_data.get('detail') or str(e)
                    error_info['error_type'] = error_data.get('_error_type', 'HTTPError')
                    # Also preserve the full error data
                    error_info['error_data'] = error_data
                except:
                    error_info['detail'] = e.response.text or str(e)
            
            # Create exception with preserved information
            error_msg = error_info.get('detail') or error_info.get('message', str(e))
            exception = Exception(f"Taiga API error: {error_msg}")
            exception.error_info = error_info  # Attach error info for checking
            raise exception
        except requests.exceptions.RequestException as e:
            print(f"Taiga API error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    raise Exception(f"Taiga API error: {error_data.get('detail', str(e))}")
                except:
                    raise Exception(f"Taiga API error: {e.response.text or str(e)}")
            raise Exception(f"Taiga API error: {str(e)}")
    
    def get_project(self, project_slug: Optional[str] = None) -> Dict[str, Any]:
        """Get Taiga project details"""
        slug = project_slug or self.project_slug
        if not slug:
            raise ValueError("Project slug is required")
        
        return self._make_request('GET', f'/projects/by_slug?slug={slug}')
    
    def create_issue(
        self,
        subject: str,
        description: str = '',
        project_slug: Optional[str] = None,
        priority: str = 'normal',
        tags: Optional[List[str]] = None,
        assigned_to: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create a new issue in Taiga
        
        Args:
            subject: Issue subject/title
            description: Issue description
            project_slug: Taiga project slug (defaults to configured project)
            priority: Issue priority (low, normal, high, critical)
            tags: List of tags
            assigned_to: User ID to assign issue to
            
        Returns:
            Created issue data
        """
        slug = project_slug or self.project_slug
        if not slug:
            raise ValueError("Project slug is required")
        
        # Get project to get project ID and issue types
        project = self.get_project(slug)
        project_id = project.get('id')
        
        # Get default issue type from project
        issue_types = project.get('issue_types', [])
        default_issue_type_id = None
        if issue_types:
            # Try to find the default issue type
            for issue_type in issue_types:
                if issue_type.get('is_default'):
                    default_issue_type_id = issue_type.get('id')
                    break
            # Fallback to first available issue type if no default found
            if not default_issue_type_id:
                default_issue_type_id = issue_types[0].get('id')
                print(f"Warning: No default issue type found, using first available: {default_issue_type_id}")
        else:
            print(f"Warning: No issue types found in project. Type field will be omitted.")
        
        # Get valid priorities from project and map CRM priority to Taiga priority ID
        # Try multiple possible paths for priorities in project response
        project_priorities = (
            project.get('priorities') or 
            project.get('priority_extra_info') or
            project.get('issue_priorities') or
            []
        )
        
        # If project_priorities is not a list, try to make it one
        if project_priorities and not isinstance(project_priorities, list):
            if isinstance(project_priorities, dict):
                project_priorities = [project_priorities]
            else:
                project_priorities = []
        
        taiga_priority_id = None
        
        if project_priorities:
            print(f"Debug: Found {len(project_priorities)} priorities in project")
            # Map CRM priority names to Taiga priority IDs from project
            # CRM priorities: low, medium, normal, high, urgent, critical
            # Try to match by name (case-insensitive) or order
            priority_name_map = {
                'low': ['low', 'minor'],
                'medium': ['medium', 'normal'],
                'normal': ['normal', 'medium'],
                'high': ['high', 'major'],
                'urgent': ['urgent', 'critical'],
                'critical': ['critical', 'urgent'],
            }
            
            priority_lower = priority.lower()
            priority_names_to_try = priority_name_map.get(priority_lower, [priority_lower])
            
            # Try to find matching priority by name
            for priority_name in priority_names_to_try:
                for project_priority in project_priorities:
                    project_priority_name = project_priority.get('name', '').lower()
                    if priority_name == project_priority_name:
                        taiga_priority_id = project_priority.get('id')
                        break
                if taiga_priority_id:
                    break
            
            # If no match found, use default priority (usually the first one or marked as default)
            if not taiga_priority_id:
                for project_priority in project_priorities:
                    if project_priority.get('is_default'):
                        taiga_priority_id = project_priority.get('id')
                        break
                
                # Fallback to first available priority
                if not taiga_priority_id and project_priorities:
                    taiga_priority_id = project_priorities[0].get('id')
                    print(f"Warning: No matching priority found for '{priority}', using default priority: {taiga_priority_id}")
        else:
            print(f"Warning: No priorities found in project. Priority field will be omitted.")
        
        # Create issue payload
        issue_data = {
            'project': project_id,
            'subject': subject,
            'description': description,
        }
        
        # Add optional fields only if they're valid
        if taiga_priority_id:
            issue_data['priority'] = taiga_priority_id
        
        # Add issue type if we found a valid one
        if default_issue_type_id:
            issue_data['type'] = default_issue_type_id
        
        if tags:
            issue_data['tags'] = tags
        
        if assigned_to:
            issue_data['assigned_to'] = assigned_to
        
        # Try to create issue with priority and type first
        # If permission denied or bad request, retry without restricted fields
        try:
            issue = self._make_request('POST', '/issues', issue_data)
        except Exception as e:
            error_msg = str(e)
            error_info = getattr(e, 'error_info', {})
            status_code = error_info.get('status_code')
            
            # Log the full error for debugging
            print(f"Taiga API request failed: status={status_code}, error={error_msg}")
            if error_info.get('error_data'):
                print(f"Full error data: {error_info.get('error_data')}")
            
            # Check if it's a permission error (403) or bad request (400)
            is_permission_error = (
                status_code == 403 or
                'permission' in error_msg.lower() or
                'PermissionDenied' in str(error_info.get('error_type', ''))
            )
            
            is_bad_request = status_code == 400
            
            # Handle both permission errors (403) and bad requests (400)
            # Both can occur due to invalid fields or insufficient permissions
            if is_permission_error or is_bad_request:
                # On any permission error (403) or bad request (400), remove priority and type proactively
                # This prevents sequential errors where priority fails, then type fails
                removed_anything = False
                
                # Check which field was mentioned in the error (for logging)
                # Check both error message and error data dictionary
                error_data = error_info.get('error_data', {})
                is_priority_error = (
                    'priority' in error_msg.lower() or 
                    'priority' in str(error_data).lower() or
                    'priority' in error_data
                )
                is_type_error = (
                    'type' in error_msg.lower() or 
                    'type' in str(error_data).lower() or
                    'type' in error_data
                )
                
                error_type_str = "Bad request" if is_bad_request else "Permission error"
                
                # Remove both priority and type on ANY permission/bad request error
                # This prevents the common case where priority fails, then type fails on retry
                if 'priority' in issue_data:
                    print(f"Warning: {error_type_str} detected - removing priority field")
                    issue_data.pop('priority', None)
                    removed_anything = True
                
                if 'type' in issue_data:
                    print(f"Warning: {error_type_str} detected - removing type field")
                    issue_data.pop('type', None)
                    removed_anything = True
                
                # If we removed any fields, retry
                if removed_anything:
                    try:
                        issue = self._make_request('POST', '/issues', issue_data)
                    except Exception as retry_error:
                        # If retry also fails with permission error or bad request, remove all optional fields
                        retry_error_msg = str(retry_error)
                        retry_error_info = getattr(retry_error, 'error_info', {})
                        retry_status_code = retry_error_info.get('status_code')
                        
                        is_retry_permission_error = (
                            retry_status_code == 403 or
                            'permission' in retry_error_msg.lower()
                        )
                        
                        is_retry_bad_request = retry_status_code == 400
                        
                        if is_retry_permission_error or is_retry_bad_request:
                            # Remove all optional fields as a last resort
                            retry_error_type_str = "bad request" if is_retry_bad_request else "permission errors"
                            print(f"Warning: Still getting {retry_error_type_str}, removing all optional fields")
                            issue_data.pop('priority', None)
                            issue_data.pop('type', None)
                            issue_data.pop('assigned_to', None)
                            issue_data.pop('tags', None)
                            
                            # Final retry with minimal fields (only project, subject, description)
                            try:
                                issue = self._make_request('POST', '/issues', issue_data)
                            except Exception as final_error:
                                # If even minimal fields fail, raise the error
                                print(f"Error: Failed to create issue even with minimal fields: {final_error}")
                                raise final_error
                        else:
                            raise retry_error
                else:
                    # Permission/bad request error but not related to priority/type - re-raise
                    raise
            else:
                # Not a permission error - re-raise
                raise
        
        # Build issue URL
        issue_url = f"https://tree.taiga.io/project/{slug}/issue/{issue.get('ref')}"
        
        return {
            'id': issue.get('id'),
            'ref': issue.get('ref'),
            'subject': issue.get('subject'),
            'status': issue.get('status_extra_info', {}).get('name', 'New'),
            'url': issue_url,
            'project_slug': slug,
        }
    
    def get_issue(self, issue_id: int) -> Dict[str, Any]:
        """Get issue details from Taiga"""
        issue = self._make_request('GET', f'/issues/{issue_id}')
        
        # Build issue URL
        project_slug = issue.get('project_extra_info', {}).get('slug', self.project_slug)
        issue_url = f"https://tree.taiga.io/project/{project_slug}/issue/{issue.get('ref')}"
        
        return {
            'id': issue.get('id'),
            'ref': issue.get('ref'),
            'subject': issue.get('subject'),
            'description': issue.get('description'),
            'status': issue.get('status_extra_info', {}).get('name', 'Unknown'),
            'status_id': issue.get('status'),
            'priority': issue.get('priority'),
            'url': issue_url,
            'project_slug': project_slug,
            'assigned_to': issue.get('assigned_to'),
            'created_date': issue.get('created_date'),
            'modified_date': issue.get('modified_date'),
        }
    
    def update_issue_status(self, issue_id: int, status_name: str) -> Dict[str, Any]:
        """
        Update issue status in Taiga
        
        Args:
            issue_id: Taiga issue ID
            status_name: New status name (e.g., 'In Progress', 'Ready for Test', 'Done')
            
        Returns:
            Updated issue data
        """
        # Get current issue to find project and available statuses
        issue = self._make_request('GET', f'/issues/{issue_id}')
        project_id = issue.get('project')
        
        # Get project statuses
        project = self._make_request('GET', f'/projects/{project_id}')
        issue_statuses = project.get('issue_statuses', [])
        
        # Find status ID by name
        status_id = None
        for status in issue_statuses:
            if status.get('name', '').lower() == status_name.lower():
                status_id = status.get('id')
                break
        
        if not status_id:
            raise ValueError(f"Status '{status_name}' not found in project")
        
        # Update issue
        update_data = {
            'status': status_id,
        }
        
        updated_issue = self._make_request('PATCH', f'/issues/{issue_id}', update_data)
        
        # Build issue URL
        project_slug = updated_issue.get('project_extra_info', {}).get('slug', self.project_slug)
        issue_url = f"https://tree.taiga.io/project/{project_slug}/issue/{updated_issue.get('ref')}"
        
        return {
            'id': updated_issue.get('id'),
            'ref': updated_issue.get('ref'),
            'subject': updated_issue.get('subject'),
            'status': updated_issue.get('status_extra_info', {}).get('name', 'Unknown'),
            'url': issue_url,
            'project_slug': project_slug,
        }
    
    def sync_issue_status(self, issue_id: int) -> Dict[str, Any]:
        """
        Get current issue status from Taiga (for syncing)
        
        Returns:
            Current issue data with status
        """
        return self.get_issue(issue_id)


def get_taiga_service() -> TaigaService:
    """Get Taiga service instance"""
    return TaigaService()

