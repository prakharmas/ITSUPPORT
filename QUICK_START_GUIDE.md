# ⚡ Quick Start Guide - IT Support Tool

## 🚀 Get Started in 5 Minutes

### Step 1: Setup Database (1 minute)
```bash
cd backend
python run_notification_migration_simple.py
```

**What this does:**
- Creates `notifications` table
- Creates `notification_preferences` table
- Creates `activity_reports` table

---

### Step 2: Start Backend (30 seconds)
```bash
# From root directory
python start_backend.py
```

**Backend runs on:** http://localhost:8000

---

### Step 3: Start Frontend (30 seconds)
```bash
# New terminal
npm run dev
```

**Frontend runs on:** http://localhost:5173

---

### Step 4: Login (30 seconds)

**Use existing credentials or create new user**

Default test users (if you have them):
- PM: `pm@example.com` / password
- Dev: `dev@example.com` / password
- Requester: `requester@example.com` / password

---

### Step 5: Test Features (2 minutes)

#### **Test 1: Notifications**
1. Login as PM
2. Look for bell icon 🔔 in bottom-left sidebar
3. Assign a ticket to a developer
4. Login as Developer
5. See notification bell has badge!
6. Click bell to view notification
7. Click notification to jump to ticket

#### **Test 2: Activity Logging**
1. Login as Developer
2. Click "Activity Log" in sidebar
3. Fill out the form:
   - Date: Today
   - Activity: Coding
   - Time: 9:00 AM - 5:00 PM
   - Description: "Fixed login bug"
4. Click "Log Activity"
5. See it in recent reports
6. Click "View All Reports" to see summary

#### **Test 3: Ticket Reopen**
1. Login as Requester
2. Find a "Done" ticket you created
3. Click on it to open details
4. Click "🔄 Reopen Ticket" button
5. Enter reason: "Still not working properly"
6. See ticket back in Backlog
7. See comment added automatically

#### **Test 4: PM Reassignment**
1. Login as PM
2. Open any ticket
3. See "Reassign Ticket" section
4. Select different developer
5. See automatic comment
6. Developer gets notification

---

## 🎯 Common Tasks

### **Create a Ticket**
1. Click "Create Item"
2. Fill title and description
3. Select type (Support/Feature)
4. Set priority
5. Click "Create Item"

### **Check My Tickets (Developer)**
1. Go to "Board"
2. Already filtered to "My Tickets"
3. Drag cards to update status
4. Or click card → Update status with buttons

### **Assign Ticket (PM)**
1. Go to "Board"
2. Filter by "Unassigned"
3. Click dropdown on card
4. Select developer
5. Done!

### **Add Comment**
1. Click any ticket card
2. Scroll to comments
3. Type your update
4. Click "Add Comment"
5. Everyone gets notified

### **Log Activity (Developer)**
1. Go to "Activity Log"
2. Fill today's work
3. Select activity type
4. Add accomplishments/blockers
5. Click "Log Activity"

### **Review Team Activity (PM)**
1. Go to "Activity Log"
2. Click "View All Reports"
3. Filter by developer or date
4. See summary stats
5. Review detailed logs

### **Configure Notifications**
1. Go to "Settings"
2. Stay on "Notifications" tab
3. Toggle email/in-app preferences
4. Set digest frequency
5. Auto-saved!

---

## 🔔 Notification Guide

### **Where to find notifications:**
- Bell icon in sidebar (bottom-left on desktop)
- Badge shows unread count
- Click to open dropdown

### **What notifications you'll get:**
- 🎯 Ticket assigned to you
- 💬 Someone comments
- 📊 Status changes
- 🔄 Ticket reopened
- ⏰ Due date reminders
- ⚠️ SLA alerts

### **How to manage:**
- Click notification → Jump to ticket
- Individual: Auto-marked as read when clicked
- Bulk: "Mark all read" button
- Configure: Settings → Notifications

---

## 🎨 UI Tips

### **Filters:**
- Board has smart filters
- Developers default to "My Tickets"
- PMs can see "All" or filter by assignee
- Use priority/type filters to focus

### **Status Updates:**
- **Drag & drop** on Board
- **Buttons** on detail page
- Both add automatic comments

### **Navigation:**
- Dashboard → Overview
- Board → Kanban view
- Activity Log → Time tracking
- Reports → Analytics
- Settings → Preferences

---

## 🐛 Troubleshooting

**Problem:** Notification bell not showing  
**Solution:** Check `NotificationBell` imported in `Layout.jsx`

**Problem:** No notifications appearing  
**Solution:** Run migration script first

**Problem:** Can't see other users' tickets (Developer)  
**Solution:** This is correct! Developers only see assigned tickets by default

**Problem:** Reports show 0  
**Solution:** Reports show all-time stats now, should have data

**Problem:** Can't assign tickets  
**Solution:** Only PMs can assign tickets

---

## 💡 Pro Tips

1. **Use Emojis in Comments** - Makes them more readable
2. **Log Activity Daily** - Better for reports
3. **Check Notifications** - Don't miss assignments
4. **Use Reopen Wisely** - Provide clear reasons
5. **Filter Unassigned (PM)** - Find tickets to assign
6. **Add Accomplishments** - Track your wins
7. **Note Blockers** - Communicate issues
8. **Use Due Dates** - Set SLA expectations
9. **Check Reports** - Track productivity
10. **Customize Preferences** - Reduce noise

---

## 📈 Success Metrics

Track these to measure tool effectiveness:
- **Response Time** - How fast tickets assigned
- **Resolution Time** - Time to complete
- **Reopen Rate** - Quality indicator
- **SLA Compliance** - Meeting deadlines
- **Activity Logging** - Team engagement
- **Notification Read Rate** - User engagement

---

## 🎉 You're Ready!

Your IT Support Tool is now:
- ✅ Fully functional
- ✅ Production-ready
- ✅ Feature-complete (80%)
- ✅ Modern and professional
- ✅ Easy to use
- ✅ Scalable

**Start using it today!** 🚀

---

## 📞 Quick Reference

| Action | Role | Location |
|--------|------|----------|
| Create Ticket | All | Create Item |
| Assign Ticket | PM | Board / Detail |
| Update Status | Dev | Board / Detail |
| Reopen Ticket | Requester | Detail Page |
| Add Comment | All | Detail Page |
| Log Activity | Dev/PM | Activity Log |
| View Reports | All | Reports |
| Configure | All | Settings |
| Check Notifications | All | Bell Icon |
| Reassign | PM | Detail Page |

---

**Need help?** Check the full guides:
- `NOTIFICATION_SYSTEM_GUIDE.md`
- `SYSTEM_REVIEW_AND_RECOMMENDATIONS.md`
- `COMPLETE_FEATURE_SUMMARY.md`

Happy ticket managing! 🎊








