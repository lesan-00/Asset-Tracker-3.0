# Asset Buddy Backend

A comprehensive REST API for managing IT assets, including laptops, staff assignments, and maintenance issues.

## Features

- **Laptop Management**: Track laptop inventory, status, and warranty information
- **Staff Management**: Manage employee information and departments
- **Asset Assignments**: Handle laptop assignments and returns
- **Issue Tracking**: Report and track hardware issues and maintenance
- **RESTful API**: Complete REST API with validation and error handling
- **TypeScript**: Type-safe backend with full type definitions
- **MySQL**: Persistent data storage with normalized schema

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MySQL 5.7+
- **Validation**: Zod
- **Authentication**: JWT (ready to implement)

## Project Structure

```
src/
├── index.ts                 # Application entry point
├── config/                  # Configuration files
├── database/
│   ├── connection.ts       # Database connection pool
│   └── init.ts             # Database schema initialization
├── models/                 # Data models
│   ├── Laptop.ts
│   ├── Staff.ts
│   ├── Assignment.ts
│   └── Issue.ts
├── controllers/            # Request handlers
│   ├── laptopController.ts
│   ├── staffController.ts
│   ├── assignmentController.ts
│   └── issueController.ts
├── routes/                 # API routes
│   ├── laptops.ts
│   ├── staff.ts
│   ├── assignments.ts
│   └── issues.ts
├── middleware/             # Custom middleware
│   ├── errorHandler.ts
│   └── common.ts
├── types/                  # TypeScript type definitions
│   ├── index.ts
│   └── schemas.ts
└── utils/                  # Utility functions
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Database Setup**
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=asset_buddy
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your-secret-key
   ```

   Create the database:
   ```bash
   mysql -u root -p -e "CREATE DATABASE asset_buddy;"
   ```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

### Laptops
- `POST /api/laptops` - Create a new laptop
- `GET /api/laptops` - Get all laptops (supports `?status=available` filter)
- `GET /api/laptops/:id` - Get laptop by ID
- `PUT /api/laptops/:id` - Update laptop
- `DELETE /api/laptops/:id` - Delete laptop

### Staff
- `POST /api/staff` - Create a new staff member
- `GET /api/staff` - Get all staff members
- `GET /api/staff/:id` - Get staff by ID
- `PUT /api/staff/:id` - Update staff
- `DELETE /api/staff/:id` - Delete staff

### Assignments
- `POST /api/assignments` - Create a new assignment
- `GET /api/assignments` - Get all assignments (supports `?active=true` filter)
- `GET /api/assignments/:id` - Get assignment by ID
- `PATCH /api/assignments/:id/return` - Return a laptop
- `DELETE /api/assignments/:id` - Delete assignment

### Issues
- `POST /api/issues` - Report a new issue
- `GET /api/issues` - Get all issues (supports `?status=open` filter)
- `GET /api/issues/:id` - Get issue by ID
- `PUT /api/issues/:id` - Update issue
- `DELETE /api/issues/:id` - Delete issue

### Health Check
- `GET /api/health` - Server health status

## Example Requests

### Create a Laptop
```bash
curl -X POST http://localhost:5000/api/laptops \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "ABC123456",
    "model": "ThinkPad X1 Carbon",
    "brand": "Lenovo",
    "purchaseDate": "2024-01-15T00:00:00Z",
    "warrantyExpiry": "2027-01-15T00:00:00Z",
    "status": "available",
    "notes": "Business laptop"
  }'
```

### Create a Staff Member
```bash
curl -X POST http://localhost:5000/api/staff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "department": "Engineering",
    "position": "Senior Developer",
    "joinDate": "2024-01-01T00:00:00Z",
    "phoneNumber": "+1234567890"
  }'
```

### Assign a Laptop
```bash
curl -X POST http://localhost:5000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "laptopId": "uuid-here",
    "staffId": "uuid-here",
    "assignedDate": "2024-02-01T00:00:00Z",
    "notes": "Assignment for new project"
  }'
```

### Report an Issue
```bash
curl -X POST http://localhost:5000/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "laptopId": "uuid-here",
    "title": "Screen flickering",
    "description": "Display has intermittent flickering",
    "status": "open",
    "priority": "high",
    "reportedDate": "2024-02-01T00:00:00Z"
  }'
```

## Database Schema

### Users Table
- id (VARCHAR(36), Primary Key)
- email (VARCHAR(255), Unique)
- password (VARCHAR(255))
- full_name (VARCHAR(255))
- role (VARCHAR(50): admin, manager, user)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Laptops Table
- id (VARCHAR(36), Primary Key)
- serial_number (VARCHAR(255), Unique)
- model (VARCHAR(255))
- brand (VARCHAR(255))
- purchase_date (TIMESTAMP)
- warranty_expiry (TIMESTAMP)
- status (VARCHAR(50): available, assigned, repair, lost, retired)
- notes (LONGTEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Staff Table
- id (VARCHAR(36), Primary Key)
- name (VARCHAR(255))
- email (VARCHAR(255), Unique)
- department (VARCHAR(255))
- position (VARCHAR(255))
- join_date (TIMESTAMP)
- phone_number (VARCHAR(20))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Assignments Table
- id (VARCHAR(36), Primary Key)
- laptop_id (VARCHAR(36), Foreign Key)
- staff_id (VARCHAR(36), Foreign Key)
- assigned_date (TIMESTAMP)
- returned_date (TIMESTAMP, Nullable)
- notes (LONGTEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Issues Table
- id (VARCHAR(36), Primary Key)
- laptop_id (VARCHAR(36), Foreign Key)
- title (VARCHAR(255))
- description (LONGTEXT)
- status (VARCHAR(50): open, in-progress, resolved, closed)
- priority (VARCHAR(50): low, medium, high, critical)
- reported_date (TIMESTAMP)
- resolved_date (TIMESTAMP, Nullable)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### Reports Table
- id (VARCHAR(36), Primary Key)
- title (VARCHAR(255))
- type (VARCHAR(50): inventory, assignments, issues, maintenance)
- generated_at (TIMESTAMP)
- data (JSON)
- created_at (TIMESTAMP)

## Error Handling

All endpoints return JSON responses with the following structure:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Validation

All inputs are validated using Zod schemas. Invalid requests will return a 400 Bad Request with validation error details.

## Future Enhancements

- JWT authentication and authorization
- User roles and permissions
- Advanced reporting and analytics
- Bulk operations
- Export to CSV/PDF
- Real-time notifications
- Audit logging
- Two-factor authentication

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass
4. Submit a pull request

## License

MIT
