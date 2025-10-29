# Modern CRM System

A comprehensive Customer Relationship Management system built for small and medium businesses with a modern dark-themed interface.

## 🚀 Features

- **Customer Management** - Complete CRM with customer profiles, history, and interactions
- **Logging System** - Track all customer interactions, samples, and activities
- **Complaint Management** - Dedicated module for handling customer complaints with SLA tracking
- **Email Integration** - Gmail API integration via n8n for email tracking
- **Advanced Search** - Full-text search across all CRM data
- **Multi-Tenancy** - Support for multiple independent organizations
- **Role-Based Access Control** - Comprehensive permission system
- **Modern UI** - Sleek dark theme with purple accents

## 🏗️ Tech Stack

### Backend
- **Python** - Flask REST API
- **Firebase** - Firestore database and Authentication
- **Gmail API** - Email integration
- **n8n** - Workflow automation

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Vite** - Build tool

### Mobile (Phase 3)
- **Kotlin** - Native Android app

## 📁 Project Structure

```
CRMS/
├── backend/          # Python Flask API
│   ├── api/         # API route handlers
│   ├── models/      # Data models
│   ├── services/    # Business logic
│   └── utils/       # Utility functions
├── frontend/        # React TypeScript app
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── hooks/
├── mobile/          # Kotlin Android app (Phase 3)
└── PRD.md          # Product Requirements Document
```

## ⚡ Current Status

**✅ MVP Phase 1 is ~60% complete!**

**Implemented:**
- Complete backend API with authentication
- Customer CRUD operations
- Activity logging system
- User authentication (Firebase)
- Modern UI with login/register
- Dashboard and customer management pages

**Ready for:**
- User registration and login
- Viewing and searching customers
- Basic customer data management

See [BUILD_PROGRESS.md](./BUILD_PROGRESS.md) for detailed progress.

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Firebase account (required)
- Gmail API credentials (for email features - future)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run server
python app.py
```

Backend will be available at `http://localhost:5000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create .env file with Firebase credentials

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## 📚 Documentation

See [PRD.md](./PRD.md) for complete product requirements and specifications.

## 🗺️ Development Roadmap

### Phase 1: MVP (8-12 weeks) ✅ ~60% Complete
- [x] Project structure
- [x] Backend setup
- [x] Frontend setup
- [x] Firebase authentication
- [x] Customer CRUD operations (Backend + API)
- [x] Logging system (Backend + API)
- [x] Multi-tenancy structure
- [x] Role-based access control structure
- [ ] Complaint management (models ready, API pending)
- [ ] Email integration
- [ ] Complete UI for all features
- [ ] Basic search

### Phase 2: Automation & Intelligence (6-8 weeks)
- [ ] Automated email sorting
- [ ] Conversational interface
- [ ] Advanced search with filters
- [ ] Taiga integration
- [ ] Telegram bot
- [ ] Analytics dashboard

### Phase 3: Enhanced Communication (6-8 weeks)
- [ ] VoIP call integration
- [ ] Voice commands
- [ ] Mobile app (Android)
- [ ] Advanced analytics

### Phase 4: Optimization & Scaling (Ongoing)
- [ ] Performance optimization
- [ ] Advanced AI/ML features
- [ ] Multi-language support
- [ ] iOS app
- [ ] Third-party integrations

## 🎨 Design System

### Colors
- Primary Background: `#1a1a2e`
- Secondary Background: `#16213e`
- Card Background: `#0f3460`
- Primary Accent: `#6C63FF` (Purple)
- Secondary Accent: `#9F7AEA` (Light Purple)

### Typography
- Font: Inter
- Text Primary: `#F9FAFB`
- Text Secondary: `#D1D5DB`

## 📝 License

This project is proprietary software.

## 🤝 Contributing

This is a private project. For questions or support, contact the development team.

## 📞 Support

For issues or questions:
- Check the [PRD.md](./PRD.md) documentation
- Review the README files in backend/ and frontend/ directories
- Contact the development team


