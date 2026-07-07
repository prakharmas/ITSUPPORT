# Branch-Based Requester Functionality Guide

## Overview
This update adds branch-based requester functionality where users can create tickets for their specific branch, and PMs can allocate tickets to developers. The system now supports three user roles with different permissions.

## User Roles & Permissions

### 1. **Requester** (Default Role)
- **Can**: Create tickets for their own branch only
- **Can**: View tickets from their own branch only
- **Cannot**: Assign tickets to developers
- **Cannot**: View other branches' tickets

### 2. **Developer**
- **Can**: View tickets from their own branch
- **Can**: Update tickets assigned to them
- **Can**: Add comments to tickets
- **Cannot**: Create tickets (unless they also have requester role)
- **Cannot**: View other branches' tickets

### 3. **Product Manager (PM)**
- **Can**: View all tickets from all branches
- **Can**: Assign tickets to developers
- **Can**: Create and manage branches
- **Can**: Create users with any role
- **Can**: Access all reports and analytics

## Database Changes

### New Tables
- `branches`: Stores branch information (id, name)

### Modified Tables
- `users`: Added `branch_id` foreign key, extended `role` enum to include 'requester'
- `work_items`: Added `branch_id` foreign key

## API Endpoints

### New Endpoints
- `GET /branches` - List all branches (PM only)
- `POST /branches` - Create new branch (PM only)
- `GET /branches/{id}` - Get specific branch (PM only)
- `PATCH /items/{id}/assign` - Assign item to developer (PM only)

### Enhanced Endpoints
- `GET /items?branch_id=X` - Filter items by branch
- `GET /users?branch_id=X` - Filter users by branch
- `POST /items` - Now automatically sets branch_id from user's branch
- `POST /users` - Now supports branch_id and requester role

## Frontend Changes Needed

### 1. **User Management (Settings Page)**
```jsx
// Add branch selector when creating users
<select {...register('branch_id')}>
  <option value="">Select Branch</option>
  {branches.map(branch => (
    <option key={branch.id} value={branch.id}>{branch.name}</option>
  ))}
</select>

// Add requester role option
<select {...register('role')}>
  <option value="requester">Requester</option>
  <option value="dev">Developer</option>
  <option value="pm">Product Manager</option>
</select>
```

### 2. **Create Item Form**
```jsx
// Hide branch selector for requesters (auto-set to their branch)
{itemType === 'requester' ? null : (
  <select {...register('branch_id')}>
    <option value="">Select Branch</option>
    {branches.map(branch => (
      <option key={branch.id} value={branch.id}>{branch.name}</option>
    ))}
  </select>
)}
```

### 3. **Board/Dashboard Filters**
```jsx
// Add branch filter for PMs
{user.role === 'pm' && (
  <select value={filter.branch} onChange={(e) => setFilter({...filter, branch: e.target.value})}>
    <option value="">All Branches</option>
    {branches.map(branch => (
      <option key={branch.id} value={branch.id}>{branch.name}</option>
    ))}
  </select>
)}
```

### 4. **Item Assignment (PM Only)**
```jsx
// Add assignment button/dropdown for PMs
{user.role === 'pm' && (
  <select 
    value={item.assignee_id || ''} 
    onChange={(e) => assignItem(item.id, e.target.value)}
  >
    <option value="">Unassigned</option>
    {developers.map(dev => (
      <option key={dev.id} value={dev.id}>{dev.name}</option>
    ))}
  </select>
)}
```

### 5. **User Context Updates**
```jsx
// Update AuthContext to handle branch information
const [branches, setBranches] = useState([])

const fetchBranches = async () => {
  if (user?.role === 'pm') {
    const response = await api.get('/branches')
    setBranches(response.data)
  }
}
```

## Setup Instructions

### 1. **Run Database Migration**
```bash
# Connect to your MySQL database and run:
mysql -u root -p itsupport < backend/migrate_branches.sql
```

### 2. **Restart Backend**
```bash
cd backend
python main.py
```

### 3. **Test the Functionality**
1. **Login as PM** (`pm@example.com` / `password123`)
2. **Create branches** via API or directly in database
3. **Create requester users** for different branches
4. **Login as requester** and create tickets
5. **Login as PM** and assign tickets to developers

## Sample Test Users (After Migration)

| Email | Password | Role | Branch | Description |
|-------|----------|------|--------|-------------|
| `pm@example.com` | `password123` | PM | HQ | Product Manager |
| `dev@example.com` | `password123` | Dev | HQ | HQ Developer |
| `east@example.com` | `password123` | Requester | East | East Branch Manager |
| `west@example.com` | `password123` | Requester | West | West Branch Manager |
| `eastdev@example.com` | `password123` | Dev | East | East Developer |
| `westdev@example.com` | `password123` | Dev | West | West Developer |

## Workflow Examples

### 1. **Requester Creates Ticket**
1. Login as `east@example.com`
2. Go to "Create Item"
3. Fill in ticket details
4. Ticket is automatically assigned to East branch
5. PM can see the ticket and assign it to a developer

### 2. **PM Assigns Ticket**
1. Login as `pm@example.com`
2. Go to Board or item detail
3. Use assignment dropdown to assign to `eastdev@example.com`
4. Developer can now work on the ticket

### 3. **Branch Filtering**
1. PM can filter tickets by branch: `GET /items?branch_id=2`
2. Requesters automatically see only their branch tickets
3. Developers see only their branch tickets

## Security Features

- **Branch Isolation**: Requesters and developers can only see their branch data
- **Role-based Access**: PMs have full access, others are restricted
- **Assignment Validation**: Only PMs can assign tickets, only to developers
- **Branch Enforcement**: Requesters cannot create tickets for other branches

## API Examples

### Create Branch (PM only)
```bash
curl -X POST "http://localhost:8000/branches" \
  -H "Authorization: Bearer <pm_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Branch"}'
```

### Assign Item (PM only)
```bash
curl -X PATCH "http://localhost:8000/items/1/assign" \
  -H "Authorization: Bearer <pm_token>" \
  -H "Content-Type: application/json" \
  -d '{"assignee_id": 3}'
```

### Filter Items by Branch
```bash
curl -X GET "http://localhost:8000/items?branch_id=2" \
  -H "Authorization: Bearer <token>"
```

## Troubleshooting

### Common Issues
1. **403 Forbidden**: Check user role and branch permissions
2. **Branch not found**: Ensure branch exists and user has access
3. **Assignment failed**: Verify assignee is a developer
4. **Empty results**: Check if user's branch has any items

### Debug Tips
1. Check user's role and branch_id: `GET /auth/me`
2. Verify branch exists: `GET /branches` (PM only)
3. Check item's branch: Look at `branch_id` in item details
4. Test with different user roles to isolate issues
