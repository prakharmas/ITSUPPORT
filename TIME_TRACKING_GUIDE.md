# ⏱️ Time Tracking System - Complete Guide

## Overview
A comprehensive time tracking system that allows developers and PMs to log time spent on tickets, track billable vs non-billable hours, and generate detailed time reports.

## 🚀 Features Implemented

### 1. **Timer Functionality**
- ⏱️ Start/stop timer for active work
- 🎯 Real-time elapsed time display (HH:MM:SS format)
- 📝 Add descriptions and activity types
- 🚫 Only one timer can run at a time per user
- ✅ Automatic time calculation when stopping

### 2. **Manual Time Entry**
- 📝 Log time manually for past work
- 🕐 Specify date and time
- 💰 Mark as billable/non-billable
- 🏷️ Select activity type from 10+ categories
- 📄 Add descriptions

### 3. **Activity Types**
- 💻 Coding
- 🧪 Testing
- 👀 Code Review
- 👥 Meeting
- 📝 Documentation
- 🐛 Debugging
- 🚀 Deployment
- 📋 Planning
- 🎧 Support
- 📦 Other

### 4. **Time Statistics**
- Total hours logged
- Billable vs non-billable breakdown
- Estimated vs actual hours
- Remaining hours
- Progress percentage
- Entry count

### 5. **Time Reports Page**
- 📊 Personal time statistics
- 📈 Team summary (PM only)
- 📅 Date range filtering
- 👤 Filter by developer (PM only)
- 📂 Activity type breakdown
- 👥 Developer breakdown
- 📝 Recent entries table
- 📊 Export to CSV

### 6. **Permissions**
- **Developers**: Can log time on assigned tickets only, view own reports
- **PMs**: Can log time on any ticket, view all reports, see team statistics
- **Requesters**: No access to time tracking

## 📁 Files Created/Modified

### Backend
```
backend/app/models/time_entry.py         - Time entry database model
backend/app/schemas/time_entry.py        - Pydantic schemas for time tracking
backend/app/routers/time_tracking.py     - API endpoints for time tracking
backend/app/models/work_item.py          - Added estimated_hours field
backend/app/models/user.py               - Added time_entries relationship
backend/app/schemas/work_item.py         - Added estimated_hours to schemas
backend/main.py                          - Integrated time_tracking router
backend/create_time_tracking.sql         - Database migration SQL
backend/run_time_tracking_migration.py   - Migration runner script
```

### Frontend
```
src/components/TimeTracker.jsx           - Timer and manual entry component
src/components/TimeEntriesList.jsx       - Time entries display component
src/pages/TimeReports.jsx                - Time reports page with analytics
src/pages/ItemDetail.jsx                 - Added time tracking section
src/App.jsx                              - Added TimeReports route
src/components/Layout.jsx                - Added Time Reports to navigation
```

## 🎯 How to Use

### For Developers

#### 1. **Start a Timer**
1. Open any ticket you're assigned to
2. Scroll to "Time Tracking" section
3. Select activity type (e.g., Coding, Testing)
4. Optionally add a description
5. Click "▶️ Start Timer"
6. Timer will run and show elapsed time
7. Update description if needed
8. Click "⏹️ Stop & Log Time" when done

#### 2. **Log Time Manually**
1. Open a ticket you're assigned to
2. Click "+ Log Time Manually"
3. Enter hours (e.g., 2.5 for 2h 30min)
4. Select activity type
5. Choose date/time
6. Add description (optional)
7. Check "Billable" if applicable
8. Click "✅ Log Time"

#### 3. **View Your Time**
- Navigate to "Time Reports" in sidebar
- See your statistics for selected date range
- View all your time entries
- Export to CSV for personal records

#### 4. **Edit/Delete Entries**
- In the time entries list
- Click ✏️ to edit your entries
- Click 🗑️ to delete entries
- Changes update statistics immediately

### For Project Managers

#### 1. **All Developer Features** (above)

#### 2. **View Team Time**
- Go to "Time Reports"
- Use "Filter by User" dropdown to see specific developer
- View team-wide activity breakdown
- See which developers logged most time
- Export team reports to CSV

#### 3. **Set Estimated Hours**
- When assigning a ticket
- Set "Estimated Hours" field
- System will track actual vs estimated
- Shows progress % and remaining hours

#### 4. **Monitor Progress**
- Check time entries on any ticket
- View billable vs non-billable hours
- See who logged time and when
- Edit/delete any time entries if needed

## 📊 API Endpoints

### Time Entry Management
```
POST   /time-tracking                      - Create manual time entry
GET    /time-tracking/ticket/{id}          - Get time entries for ticket
GET    /time-tracking/my-entries           - Get current user's entries
GET    /time-tracking/user/{id}            - Get user's entries (PM only)
PATCH  /time-tracking/{id}                 - Update time entry
DELETE /time-tracking/{id}                 - Delete time entry
```

### Timer
```
POST   /time-tracking/timer/start          - Start timer
POST   /time-tracking/timer/{id}/stop      - Stop timer
GET    /time-tracking/timer/active         - Get active timer
```

### Statistics
```
GET    /time-tracking/stats/ticket/{id}    - Get ticket time stats
GET    /time-tracking/stats/user/{id}      - Get user time stats
GET    /time-tracking/summary              - Get comprehensive summary (PM only)
```

## 📊 Database Schema

### time_entries Table
```sql
id              INT (PK)
work_item_id    INT (FK to work_items)
user_id         INT (FK to users)
hours           DECIMAL(5,2)        -- Hours in decimal (2.5 = 2h 30m)
description     TEXT
started_at      DATETIME            -- Timer start time
stopped_at      DATETIME            -- Timer stop time
is_running      BOOLEAN             -- Is timer active
is_billable     BOOLEAN             -- Billable flag
activity_type   VARCHAR(50)         -- Activity category
logged_at       DATETIME            -- When work was done
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### work_items Table (Updated)
```sql
...existing fields...
estimated_hours DECIMAL(5,2)        -- Estimated time for ticket
```

## 💡 Best Practices

### For Developers
1. **Start timer when beginning work** - Most accurate tracking
2. **Use descriptive activity types** - Better reporting
3. **Add descriptions** - Help remember what you did
4. **Log time daily** - Don't forget at end of day
5. **Mark billable correctly** - For client reporting

### For PMs
1. **Set realistic estimates** - Help developers plan
2. **Review time regularly** - Catch issues early
3. **Compare actual vs estimated** - Improve future estimates
4. **Export reports monthly** - For management review
5. **Monitor billable %** - Track project profitability

## 🎨 UI Components

### Time Tracker Component
- Compact, card-based design
- Timer with real-time updates
- Collapsible manual entry form
- Visual feedback (pulsing dot for active timer)
- Automatic time formatting

### Time Entries List
- Summary statistics cards with color coding
- Progress bar for estimated hours
- Sortable entries with actions
- Inline editing capability
- Responsive table layout

### Time Reports Page
- Date range picker
- Filter controls
- Statistics dashboard
- Activity breakdowns with charts
- Exportable data table

## 📈 Reporting Capabilities

### Individual Reports
- Total hours worked
- Billable percentage
- Activity type breakdown
- Daily/weekly/monthly views
- CSV export

### Team Reports (PM Only)
- Team total hours
- Per-developer breakdown
- Activity distribution
- Time trends
- Comparative analysis

## 🔐 Security & Permissions

- ✅ Developers can only log time on assigned tickets
- ✅ Users can only edit/delete their own entries
- ✅ PMs have full access to all time data
- ✅ Requesters have no access to time tracking
- ✅ API validates permissions on every request

## 📱 Mobile Responsive
- ✅ Timer works on mobile devices
- ✅ Touch-friendly buttons
- ✅ Responsive grid layouts
- ✅ Compact forms for small screens

## 🚀 Future Enhancements (Optional)

1. **Charts & Graphs**
   - Time trend charts
   - Activity pie charts
   - Burndown charts

2. **Integrations**
   - Calendar sync
   - Slack notifications
   - Email digests

3. **Advanced Features**
   - Bulk time entry
   - Time templates
   - Recurring tasks
   - Budget tracking
   - Invoice generation

4. **Productivity Metrics**
   - Focus time analysis
   - Interruption tracking
   - Efficiency scores
   - Velocity tracking

## 🐛 Troubleshooting

### Timer won't start
- Check if you have another timer running
- Ensure you're assigned to the ticket
- Refresh the page

### Can't see time tracking
- Ensure you're a Developer or PM
- Check if ticket is assigned to you
- Verify your role permissions

### Statistics not updating
- Refresh the page
- Check date range filters
- Verify entries were saved

## 📞 Support

For issues or questions:
1. Check this guide
2. Review API documentation
3. Contact your PM
4. Check browser console for errors

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Status**: ✅ Production Ready







