# IT Support Tool

A comprehensive in-house tool that keeps support and product work moving on "autopilot" with FastAPI + React + MySQL.

## Features

### Core Functionality
- **Single backlog** for Support and Product items (type = support | feature)
- **Kanban board** with drag & drop: Backlog → In Progress → Review → Done
- **On-call rotation** (weekly): new support tickets auto-assign to the on-call dev
- **SLA & reminders**: due-soon/overdue nudges via email/Slack
- **Daily standup digest**: automated daily reports per person
- **Weekly reports**: tickets opened/closed, feature throughput metrics

### User Management
- **Authentication**: JWT-based with email/password
- **Roles**: PM (Product Manager) and Dev (Developer)
- **PM permissions**: User creation, on-call roster management
- **Developer permissions**: Create tickets, update work items

### Autopilot Features
- **Daily standup digest** (9:00 AM): yesterday/today/blockers per person
- **SLA reminders** (hourly): notifications for items due soon/overdue
- **On-call rotation** (Monday 9:00 AM): automatic weekly rotation
- **Auto-assignment**: support tickets assigned to current on-call person

## Tech Stack

- **Backend**: FastAPI with SQLAlchemy ORM
- **Frontend**: React with Vite, Tailwind CSS
- **Database**: MySQL
- **Authentication**: JWT tokens
- **Scheduling**: APScheduler for background jobs
- **Notifications**: SMTP email + Slack webhook support

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL 5.7+

### 1. Database Setup

```bash
# Create database
mysql -u root -p
CREATE DATABASE itsupport;

# Initialize schema and sample data
mysql -u root -p itsupport < database_init.sql
```

### 2. Quick Setup

```bash
# Run the setup script (installs all dependencies)
python setup.py
```

### 3. Manual Setup (Alternative)

```bash
# Backend Setup
pip install -r backend/requirements.txt

# Frontend Setup
npm install

# Configure environment
cp env.example .env
# Edit .env with your database and email settings
```

### 4. Start Services

You can start the services in three ways:

**Option 1: Start both services together**
```bash
python run.py
```

**Option 2: Start services separately**
```bash
# Terminal 1 - Backend
python start_backend.py

# Terminal 2 - Frontend  
python start_frontend.py
```

**Option 3: Manual start**
```bash
# Terminal 1 - Backend with uvicorn
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 - Frontend
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Default Login Credentials

- **PM User**: pm@example.com / password123
- **Dev User**: dev@example.com / password123

## Quick Start Commands

```bash
# 1. Setup everything
python setup.py

# 2. Configure environment
cp env.example .env
# Edit .env with your settings

# 3. Start services (choose one option)

# Option A: Both services together
python run.py

# Option B: Separate terminals
python start_backend.py    # Terminal 1
python start_frontend.py   # Terminal 2

# Option C: Manual commands
cd backend && uvicorn main:app --reload    # Terminal 1
npm run dev                               # Terminal 2
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/itsupport

# JWT
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com

# Slack (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# App
DEBUG=True
HOST=localhost
PORT=8000
```

## Usage

### For Product Managers

1. **User Management**: Create new users (PM can create both PM and Dev users)
2. **On-Call Setup**: Configure weekly on-call rotation in Settings
3. **Reports**: Monitor weekly metrics and SLA performance
4. **Settings**: Manage system configuration and notifications

### For Developers

1. **Dashboard**: View assigned items and daily metrics
2. **Kanban Board**: Drag & drop items between status columns
3. **Create Items**: Add new support tickets or feature requests
4. **Comments**: Add updates and notes to work items

### Autopilot Features

The system automatically:

- **Assigns support tickets** to the current week's on-call person
- **Sends daily standup digests** at 9:00 AM with yesterday's activity
- **Monitors SLA deadlines** and sends reminders hourly
- **Rotates on-call** every Monday at 9:00 AM
- **Notifies PMs** of critical items and overdue tickets

## API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration (PM only)
- `GET /auth/me` - Get current user

### Work Items
- `GET /items` - List items with filters
- `POST /items` - Create new item
- `PATCH /items/{id}` - Update item
- `POST /items/{id}/comments` - Add comment

### On-Call
- `GET /oncall/current` - Get current on-call person
- `GET /oncall/roster` - Get rotation schedule
- `POST /oncall/seed` - Seed rotation (PM only)

### Reports
- `GET /reports/weekly` - Weekly metrics
- `GET /reports/standup/{user_id}` - User standup digest
- `GET /reports/sla-alerts` - Active SLA alerts

## Database Schema

The tool uses a simple MySQL schema with these main tables:

- `users` - User accounts and roles
- `work_items` - Support tickets and feature requests
- `item_comments` - Activity and updates
- `oncall_roster` - Weekly rotation schedule
- `projects` - Optional project grouping

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend Development

```bash
npm install
npm run dev
```

### Adding New Features

1. **Backend**: Add new models in `app/models/`, schemas in `app/schemas/`, and routes in `app/routers/`
2. **Frontend**: Add new pages in `src/pages/` and components in `src/components/`
3. **Database**: Update schema in `database_init.sql`

## Deployment

### Production Considerations

1. **Database**: Use a managed MySQL service (AWS RDS, Google Cloud SQL)
2. **Backend**: Deploy with Gunicorn + Nginx or Docker
3. **Frontend**: Build and serve static files with Nginx
4. **Environment**: Set production environment variables
5. **SSL**: Use HTTPS in production
6. **Monitoring**: Add logging and error tracking

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the API documentation at `/docs`
2. Review the database schema in `database_init.sql`
3. Check the environment configuration
4. Review the logs for error messages

## Roadmap

- [ ] Real-time notifications with WebSockets
- [ ] Advanced reporting and analytics
- [ ] Integration with external tools (Jira, GitHub)
- [ ] Mobile app for on-call management
- [ ] Advanced SLA management and escalation
- [ ] Team performance metrics and insights
