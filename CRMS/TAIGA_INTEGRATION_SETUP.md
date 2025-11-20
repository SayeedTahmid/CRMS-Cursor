# Taiga Integration Setup Guide

This guide explains how to set up Taiga integration for complaint tracking in the CRM system.

## Overview

The Taiga integration allows you to:
- **Create Taiga issues** directly from CRM complaints
- **Link existing Taiga issues** to complaints
- **Sync status** from Taiga to CRM automatically
- **Track Taiga issue status** and link on complaint detail pages

All actions respect existing RBAC permissions and tenant isolation.

## Prerequisites

1. **Taiga Account**: Sign up at [taiga.io](https://taiga.io) or use self-hosted instance
2. **Taiga Project**: Create a project in Taiga for tracking complaints
3. **API Token**: Generate an authentication token from Taiga

## Setup Steps

### 1. Get Taiga API Token

1. Log in to your Taiga instance
2. Go to **User Settings** → **Applications** → **API**
3. Click **"Create Application"** or use existing token
4. Copy the **Auth Token** (you'll need this)

### 2. Get Project Slug

1. Navigate to your Taiga project
2. The project slug is in the URL: `https://tree.taiga.io/project/{project-slug}/...`
3. Copy the `project-slug` part

### 3. Set Environment Variables

Add these to your `.env` file in the `backend` directory:

```env
# Taiga Configuration
TAIGA_API_URL=https://api.taiga.io/api/v1
# For self-hosted: TAIGA_API_URL=https://your-taiga-instance.com/api/v1

TAIGA_AUTH_TOKEN=your_auth_token_here
TAIGA_PROJECT_SLUG=your-project-slug
```

### 4. Restart Backend Server

After setting environment variables, restart your backend:

```bash
cd CRMS/backend
python app.py
```

## API Endpoints

### Create Taiga Issue from Complaint
```
POST /api/taiga/create-issue
Authorization: Bearer <token>
Content-Type: application/json

{
  "complaint_id": "complaint123",
  "project_slug": "my-project",  // Optional, uses default if not provided
  "priority": "high",  // Optional
  "tags": ["bug", "customer"]  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "taiga_issue": {
    "id": 12345,
    "ref": 42,
    "subject": "Customer Complaint: Product Issue",
    "status": "New",
    "url": "https://tree.taiga.io/project/my-project/issue/42",
    "project_slug": "my-project"
  },
  "message": "Taiga issue created and linked to complaint"
}
```

### Link Existing Taiga Issue
```
POST /api/taiga/link-issue
Authorization: Bearer <token>
Content-Type: application/json

{
  "complaint_id": "complaint123",
  "taiga_issue_id": 12345
}
```

### Sync Status from Taiga
```
POST /api/taiga/sync-status
Authorization: Bearer <token>
Content-Type: application/json

{
  "complaint_id": "complaint123"
}
```

**Response:**
```json
{
  "success": true,
  "taiga_status": "In Progress",
  "crm_status": "in_progress",
  "message": "Status synced from Taiga"
}
```

### Get Taiga Issue Details
```
GET /api/taiga/issue/<issue_id>
Authorization: Bearer <token>
```

## Frontend Integration

### Complaint Detail Page

The complaint detail page now includes a **"Taiga Integration"** card in the sidebar:

#### When No Issue is Linked:
- **"Create Taiga Issue"** button - Creates a new issue in Taiga
- **"Link Existing Issue"** button - Links an existing Taiga issue by ID

#### When Issue is Linked:
- Shows issue reference number and current status
- **"Open in Taiga"** link - Opens the issue in Taiga
- **"Sync Status from Taiga"** button - Updates CRM status from Taiga

## Status Mapping

The integration maps Taiga statuses to CRM statuses:

| Taiga Status | CRM Status |
|-------------|------------|
| New | new |
| In Progress | in_progress |
| Ready for Test | in_progress |
| Done | resolved |
| Closed | closed |

You can customize this mapping in `backend/api/taiga.py` in the `sync_taiga_status` function.

## Data Model

Complaints now include these Taiga fields:

```typescript
{
  taiga_issue_id: number,        // Taiga issue ID
  taiga_issue_ref: number,        // Taiga issue reference number (#42)
  taiga_issue_url: string,        // Full URL to Taiga issue
  taiga_status: string,           // Current status from Taiga
  taiga_project_slug: string,     // Taiga project slug
}
```

## Permissions

All Taiga endpoints require:
- **Authentication**: User must be logged in
- **Permission**: `complaints.update` permission (for create/link/sync)
- **Tenant Isolation**: Users can only access complaints in their tenant

## Workflow Examples

### Example 1: Create Issue from Complaint

1. User opens a complaint detail page
2. Clicks **"Create Taiga Issue"**
3. System creates issue in Taiga with:
   - Subject: Complaint title
   - Description: Complaint description
   - Priority: Mapped from CRM priority
   - Project: Default or specified project
4. Complaint is automatically linked to the new issue
5. User can click **"Open in Taiga"** to view/edit the issue

### Example 2: Sync Status

1. User updates issue status in Taiga (e.g., "In Progress" → "Done")
2. User returns to CRM complaint detail page
3. Clicks **"Sync Status from Taiga"**
4. CRM status updates to match Taiga status
5. Status mapping converts "Done" → "resolved" in CRM

### Example 3: Link Existing Issue

1. User has an existing Taiga issue (e.g., #42)
2. User opens complaint detail page
3. Clicks **"Link Existing Issue"**
4. Enters Taiga issue ID: `12345`
5. System links the complaint to the existing issue
6. Status and details are synced

## Troubleshooting

### "Taiga not configured" error
- Check that `TAIGA_AUTH_TOKEN` is set in `.env`
- Restart backend server after setting environment variables

### "Project slug is required" error
- Set `TAIGA_PROJECT_SLUG` in `.env`
- Or provide `project_slug` in the API request

### "Complaint already linked" error
- The complaint is already linked to a Taiga issue
- Use sync status instead of creating a new issue
- Or unlink the existing issue first (manual database update)

### Status not syncing correctly
- Check status mapping in `backend/api/taiga.py`
- Verify Taiga status names match exactly (case-sensitive)
- Check Taiga API response for actual status names

### Authentication errors
- Verify `TAIGA_AUTH_TOKEN` is correct
- Check token hasn't expired
- For self-hosted: verify `TAIGA_API_URL` is correct

## Self-Hosted Taiga

If you're using a self-hosted Taiga instance:

1. Update `TAIGA_API_URL` in `.env`:
   ```env
   TAIGA_API_URL=https://your-taiga-instance.com/api/v1
   ```

2. Ensure your Taiga instance is accessible from the backend server

3. API endpoints should be the same as Taiga.io

## Advanced Configuration

### Custom Priority Mapping

Edit `backend/services/taiga_service.py`:

```python
priority_map = {
    'low': 1,
    'medium': 2,
    'normal': 2,
    'high': 3,
    'urgent': 4,
    'critical': 4,
}
```

### Custom Status Mapping

Edit `backend/api/taiga.py` in `sync_taiga_status`:

```python
status_map = {
    'new': 'new',
    'in progress': 'in_progress',
    'ready for test': 'in_progress',
    'done': 'resolved',
    'closed': 'closed',
    # Add your custom mappings
}
```

### Issue Type Configuration

By default, issues are created as type `1` (Issue). To change:

Edit `backend/services/taiga_service.py`:

```python
issue_data = {
    'project': project_id,
    'subject': subject,
    'description': description,
    'priority': taiga_priority,
    'type': 2,  # Change to your desired type ID
}
```

## Security Notes

- **Never commit** `.env` file with real tokens
- Rotate API tokens regularly
- Use environment variables or secure secret management
- Verify tenant isolation is working correctly

## Next Steps

- [ ] Add automatic status sync on complaint update
- [ ] Add webhook support for real-time sync
- [ ] Add Taiga issue comments sync
- [ ] Add bulk operations (create issues for multiple complaints)
- [ ] Add Taiga user assignment sync

## Support

- Taiga API Documentation: https://taigaio.github.io/taiga-doc/dist/api.html
- Taiga Community: https://community.taiga.io
- Taiga GitHub: https://github.com/taigaio

