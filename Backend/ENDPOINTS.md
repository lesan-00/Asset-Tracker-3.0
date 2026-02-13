# API Endpoints Reference

## Base URL
```
http://localhost:5000/api
```

## Health Check

### Server Health
```
GET /health
Response: 200 OK
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-02-06T12:00:00.000Z"
}
```

## Laptops API

### Create Laptop
```
POST /laptops
Content-Type: application/json

{
  "serialNumber": "ABC123456",
  "model": "ThinkPad X1 Carbon",
  "brand": "Lenovo",
  "purchaseDate": "2024-01-15T00:00:00Z",
  "warrantyExpiry": "2027-01-15T00:00:00Z",
  "status": "available",
  "notes": "Optional notes"
}

Response: 201 Created
```

### Get All Laptops
```
GET /laptops
Query Params: ?status=available (optional)

Response: 200 OK
Array of laptops
```

### Get Single Laptop
```
GET /laptops/:id
Parameters: id (UUID)

Response: 200 OK
Single laptop object
```

### Update Laptop
```
PUT /laptops/:id
Parameters: id (UUID)
Content-Type: application/json

{
  "status": "repair",
  "notes": "Updated notes"
}

Response: 200 OK
Updated laptop object
```

### Delete Laptop
```
DELETE /laptops/:id
Parameters: id (UUID)

Response: 200 OK
{
  "success": true,
  "message": "Laptop deleted successfully"
}
```

## Staff API

### Create Staff Member
```
POST /staff
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "department": "Engineering",
  "position": "Developer",
  "joinDate": "2024-01-01T00:00:00Z",
  "phoneNumber": "+1-555-0100"
}

Response: 201 Created
```

### Get All Staff
```
GET /staff

Response: 200 OK
Array of staff members
```

### Get Single Staff Member
```
GET /staff/:id
Parameters: id (UUID)

Response: 200 OK
Single staff object
```

### Update Staff Member
```
PUT /staff/:id
Parameters: id (UUID)
Content-Type: application/json

{
  "position": "Senior Developer",
  "department": "Tech Lead"
}

Response: 200 OK
Updated staff object
```

### Delete Staff Member
```
DELETE /staff/:id
Parameters: id (UUID)

Response: 200 OK
{
  "success": true,
  "message": "Staff deleted successfully"
}
```

## Assignments API

### Create Assignment
```
POST /assignments
Content-Type: application/json

{
  "laptopId": "550e8400-e29b-41d4-a716-446655440000",
  "staffId": "660e8400-e29b-41d4-a716-446655440001",
  "assignedDate": "2024-02-06T00:00:00Z",
  "notes": "Assignment for project X"
}

Response: 201 Created
```

### Get All Assignments
```
GET /assignments
Query Params: ?active=true (optional - active assignments only)

Response: 200 OK
Array of assignments
```

### Get Single Assignment
```
GET /assignments/:id
Parameters: id (UUID)

Response: 200 OK
Single assignment object
```

### Return Laptop
```
PATCH /assignments/:id/return
Parameters: id (UUID)
Content-Type: application/json

{
  "returnedDate": "2024-02-13T00:00:00Z",
  "notes": "Device returned in good condition"
}

Response: 200 OK
Updated assignment with returnedDate
```

### Delete Assignment
```
DELETE /assignments/:id
Parameters: id (UUID)

Response: 200 OK
{
  "success": true,
  "message": "Assignment deleted successfully"
}
```

## Issues API

### Create Issue
```
POST /issues
Content-Type: application/json

{
  "laptopId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Display flickering",
  "description": "Screen flickers intermittently",
  "status": "open",
  "priority": "high",
  "reportedDate": "2024-02-05T14:00:00Z"
}

Response: 201 Created
```

### Get All Issues
```
GET /issues
Query Params: ?status=open (optional - filter by status)

Response: 200 OK
Array of issues
```

### Get Single Issue
```
GET /issues/:id
Parameters: id (UUID)

Response: 200 OK
Single issue object
```

### Update Issue
```
PUT /issues/:id
Parameters: id (UUID)
Content-Type: application/json

{
  "status": "in-progress",
  "priority": "critical"
}

Response: 200 OK
Updated issue object
```

### Resolve Issue
```
PUT /issues/:id
Parameters: id (UUID)
Content-Type: application/json

{
  "status": "resolved",
  "resolvedDate": "2024-02-06T16:00:00Z"
}

Response: 200 OK
Resolved issue object
```

### Delete Issue
```
DELETE /issues/:id
Parameters: id (UUID)

Response: 200 OK
{
  "success": true,
  "message": "Issue deleted successfully"
}
```

## Enumeration Values

### Laptop Status
- `available` - Available for assignment
- `assigned` - Assigned to staff member
- `repair` - Under maintenance
- `lost` - Reported lost
- `retired` - No longer in service

### Issue Status
- `open` - Newly reported
- `in-progress` - Being worked on
- `resolved` - Fixed
- `closed` - Closed

### Issue Priority
- `low` - Low priority
- `medium` - Normal priority
- `high` - High priority
- `critical` - Urgent

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Success with Message
```json
{
  "success": true,
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description"
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal error |

## Quick cURL Examples

### Get Health
```bash
curl http://localhost:5000/api/health
```

### Create Laptop
```bash
curl -X POST http://localhost:5000/api/laptops \
  -H "Content-Type: application/json" \
  -d '{
    "serialNumber":"SN123",
    "model":"MacBook",
    "brand":"Apple",
    "purchaseDate":"2024-01-01T00:00:00Z",
    "warrantyExpiry":"2025-01-01T00:00:00Z",
    "status":"available"
  }'
```

### Get All Laptops
```bash
curl http://localhost:5000/api/laptops
```

### Get Available Laptops
```bash
curl "http://localhost:5000/api/laptops?status=available"
```

### Update Laptop
```bash
curl -X PUT http://localhost:5000/api/laptops/laptop-id \
  -H "Content-Type: application/json" \
  -d '{"status":"repair"}'
```

### Delete Laptop
```bash
curl -X DELETE http://localhost:5000/api/laptops/laptop-id
```

## Authentication & Authorization

**Current Status**: Not implemented yet

Future implementation will add:
- JWT token-based authentication
- Role-based access control (RBAC)
- Scoped endpoints

## Pagination & Filtering

**Current Status**: Limited filtering available

Available filters:
- Laptops: `?status=value`
- Issues: `?status=value`
- Assignments: `?active=true`

Future enhancement will add:
- Limit/offset pagination
- Advanced filtering
- Sorting options

## Rate Limiting

**Current Status**: No rate limiting

Recommended for production:
- Implement rate limiting per IP
- Implement rate limiting per user (after auth)
- Use express-rate-limit package

## API Versioning

**Current**: v1 (implied)

Future versions will support:
- `/api/v1/...`
- `/api/v2/...`
- Backward compatibility

## Testing Endpoints

### Using Postman
1. Import collection from documentation
2. Set `base_url` environment variable
3. Run requests individually or as collection

### Using curl
```bash
# Define base URL
BASE_URL="http://localhost:5000/api"

# Example request
curl $BASE_URL/laptops
```

### Using REST Client Extension (VS Code)
See QUICK_REFERENCE.md for example file format

## Troubleshooting

### 404 Not Found
- Check endpoint URL spelling
- Verify resource ID is correct
- Ensure server is running

### 400 Bad Request
- Check JSON syntax
- Verify all required fields are included
- Review API_DOCUMENTATION.md for field formats

### 500 Server Error
- Check server logs
- Verify database connection
- Restart server

## Rate Limits & Quotas

**Current**: No limits

Recommended production limits:
- 1000 requests per IP per hour
- 100 requests per authenticated user per minute
- Burst limit: 20 requests per second

---

For detailed endpoint documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

For quick start examples, see [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
