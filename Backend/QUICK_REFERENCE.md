# Quick Reference Guide

## Quick Start (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Create MySQL database
mysql -u root -p -e "CREATE DATABASE asset_buddy;"

# 3. Copy environment file
cp .env.example .env

# 4. Update .env with your database credentials
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=asset_buddy

# 5. Start development server
npm run dev

# 6. Test the API
curl http://localhost:5000/api/health
```

## Common Tasks

### Create a Laptop
```bash
curl -X POST http://localhost:5000/api/laptops \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber": "SN123456",
    "model": "MacBook Pro",
    "brand": "Apple",
    "purchaseDate": "2024-01-01T00:00:00Z",
    "warrantyExpiry": "2025-01-01T00:00:00Z",
    "status": "available",
    "notes": "15-inch Retina Display"
  }'
```

### Get All Laptops
```bash
curl http://localhost:5000/api/laptops
```

### Get Available Laptops Only
```bash
curl http://localhost:5000/api/laptops?status=available
```

### Create Staff Member
```bash
curl -X POST http://localhost:5000/api/staff \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane.smith@company.com",
    "department": "Engineering",
    "position": "Developer",
    "joinDate": "2024-01-15T00:00:00Z"
  }'
```

### Assign Laptop to Staff
```bash
curl -X POST http://localhost:5000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "laptopId": "laptop-uuid-here",
    "staffId": "staff-uuid-here",
    "assignedDate": "2024-02-06T00:00:00Z"
  }'
```

### Return Laptop
```bash
curl -X PATCH http://localhost:5000/api/assignments/assignment-uuid-here/return \
  -H "Content-Type: application/json" \
  -d '{
    "returnedDate": "2024-02-13T00:00:00Z",
    "notes": "Device in good condition"
  }'
```

### Report Issue
```bash
curl -X POST http://localhost:5000/api/issues \
  -H "Content-Type: application/json" \
  -d '{
    "laptopId": "laptop-uuid-here",
    "title": "Battery not charging",
    "description": "Battery indicator shows not charging",
    "status": "open",
    "priority": "high",
    "reportedDate": "2024-02-06T10:00:00Z"
  }'
```

### Get Open Issues
```bash
curl http://localhost:5000/api/issues?status=open
```

### Update Issue Status
```bash
curl -X PUT http://localhost:5000/api/issues/issue-uuid-here \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "resolvedDate": "2024-02-06T16:00:00Z"
  }'
```

## Build & Deploy

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker
```bash
# Build
docker build -t asset-buddy-api:latest .

# Run
docker run -p 5000:5000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/asset_buddy \
  asset-buddy-api:latest
```

## File Structure Reference

| Path | Purpose |
|------|---------|
| `src/index.ts` | Server entry point |
| `src/models/` | Database layer (CRUD operations) |
| `src/controllers/` | Request handlers & business logic |
| `src/routes/` | API endpoint definitions |
| `src/types/` | TypeScript types & validation schemas |
| `src/middleware/` | Express middleware |
| `src/database/` | Database connection & initialization |
| `dist/` | Compiled JavaScript (production) |
| `.env` | Local environment variables |

## Database Connection

The app automatically:
1. ✅ Connects to PostgreSQL
2. ✅ Creates all tables if they don't exist
3. ✅ Sets up proper relationships
4. ✅ Adds timestamps to all records

## API Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 404 | Not Found |
| 500 | Server Error |

## Data Types & Examples

### Laptop Status
- `available` - Ready for assignment
- `assigned` - Currently with staff
- `repair` - Under maintenance
- `lost` - Missing
- `retired` - No longer in use

### Issue Status
- `open` - Reported
- `in-progress` - Being worked on
- `resolved` - Fixed
- `closed` - Closed

### Issue Priority
- `low` - Non-urgent
- `medium` - Normal
- `high` - Should be addressed soon
- `critical` - Immediate attention needed

## Common Issues & Solutions

### "Cannot find database"
```bash
# Create database
createdb asset_buddy
```

### "Port 5000 already in use"
```bash
# Change PORT in .env
# Or kill the process
lsof -i :5000
kill -9 <PID>
```

### "Database connection error"
1. Check PostgreSQL is running
2. Verify DATABASE_URL in .env
3. Ensure database exists

### "TypeScript compilation error"
```bash
# Reinstall and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## Useful Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Check code quality
npm run lint

# Update dependencies
npm update

# Check vulnerabilities
npm audit

# Clean build
rm -rf dist
```

## Environment Variables

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/asset_buddy

# Optional with defaults
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

## Response Examples

### Success with Data
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "serialNumber": "ABC123456",
    ...
  }
}
```

### Success with Message
```json
{
  "success": true,
  "message": "Laptop deleted successfully"
}
```

### Error
```json
{
  "success": false,
  "error": "Laptop not found"
}
```

## Testing the API

### Using curl
```bash
# Get
curl http://localhost:5000/api/laptops

# Post
curl -X POST http://localhost:5000/api/laptops \
  -H "Content-Type: application/json" \
  -d '{"field":"value"}'

# Put
curl -X PUT http://localhost:5000/api/laptops/id \
  -H "Content-Type: application/json" \
  -d '{"field":"updated"}'

# Delete
curl -X DELETE http://localhost:5000/api/laptops/id
```

### Using Postman
1. Import the API endpoints
2. Create requests in the format shown above
3. Test with sample data

### Using VS Code REST Client
Create a `.rest` or `.http` file:
```http
@baseUrl = http://localhost:5000/api

### Get all laptops
GET {{baseUrl}}/laptops

### Create laptop
POST {{baseUrl}}/laptops
Content-Type: application/json

{
  "serialNumber": "SN123",
  "model": "MacBook",
  "brand": "Apple",
  "purchaseDate": "2024-01-01T00:00:00Z",
  "warrantyExpiry": "2025-01-01T00:00:00Z",
  "status": "available"
}
```

## Performance Tips

1. **Use Filters**: Use `?status=available` instead of filtering client-side
2. **Check Indexes**: Database has indexes on common queries
3. **Connection Pooling**: Already enabled
4. **Caching**: Consider adding Redis for frequently accessed data

## Security Reminders

⚠️ **Before Going to Production**:
1. [ ] Change JWT_SECRET to a strong, random value
2. [ ] Enable HTTPS
3. [ ] Set NODE_ENV=production
4. [ ] Implement authentication/authorization
5. [ ] Review CORS settings
6. [ ] Keep dependencies updated
7. [ ] Enable rate limiting
8. [ ] Set up monitoring and logging

## Useful Links

- **TypeScript Docs**: https://www.typescriptlang.org/docs/
- **Express.js Docs**: https://expressjs.com/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Zod Docs**: https://zod.dev/
- **Node.js Docs**: https://nodejs.org/en/docs/

## Getting Help

1. Check `API_DOCUMENTATION.md` for endpoint details
2. Check `DEPLOYMENT.md` for deployment help
3. Check `README.md` for setup instructions
4. Check inline code comments for implementation details

---

**Quick Links**:
- Documentation: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- Deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
- Full Summary: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- Setup: [README.md](README.md)
