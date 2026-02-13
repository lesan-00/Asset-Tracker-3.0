# API Documentation - Asset Buddy Backend

## Overview

Asset Buddy Backend is a RESTful API service built with Node.js, Express, and TypeScript for managing IT asset inventory, staff assignments, and issue tracking.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Currently, the API doesn't require authentication. JWT authentication will be added in future versions. All endpoints are publicly accessible.

## Response Format

All responses are returned in JSON format with the following structure:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Status Codes

- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid input or validation error
- `404` - Not Found: Resource not found
- `500` - Server Error: Internal server error

---

## Endpoints

### Health Check

#### Check Server Status
```
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-02-06T12:00:00.000Z"
}
```

---

## Laptops Management

### Create Laptop
```
POST /laptops
```

**Request Body:**
```json
{
  "serialNumber": "ABC123456",
  "model": "ThinkPad X1 Carbon",
  "brand": "Lenovo",
  "purchaseDate": "2024-01-15T00:00:00Z",
  "warrantyExpiry": "2027-01-15T00:00:00Z",
  "status": "available",
  "notes": "Business laptop with 16GB RAM"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "serialNumber": "ABC123456",
    "model": "ThinkPad X1 Carbon",
    "brand": "Lenovo",
    "purchaseDate": "2024-01-15T00:00:00.000Z",
    "warrantyExpiry": "2027-01-15T00:00:00.000Z",
    "status": "available",
    "notes": "Business laptop with 16GB RAM",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:00.000Z"
  }
}
```

### Get All Laptops
```
GET /laptops
```

**Query Parameters:**
- `status` (optional): Filter by status (available, assigned, repair, lost, retired)

**Example:**
```
GET /laptops?status=available
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "serialNumber": "ABC123456",
      "model": "ThinkPad X1 Carbon",
      "brand": "Lenovo",
      "purchaseDate": "2024-01-15T00:00:00.000Z",
      "warrantyExpiry": "2027-01-15T00:00:00.000Z",
      "status": "available",
      "notes": "Business laptop with 16GB RAM",
      "createdAt": "2024-02-06T12:00:00.000Z",
      "updatedAt": "2024-02-06T12:00:00.000Z"
    }
  ]
}
```

### Get Laptop by ID
```
GET /laptops/:id
```

**Parameters:**
- `id` (string, required): Laptop ID (UUID)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "serialNumber": "ABC123456",
    "model": "ThinkPad X1 Carbon",
    "brand": "Lenovo",
    "purchaseDate": "2024-01-15T00:00:00.000Z",
    "warrantyExpiry": "2027-01-15T00:00:00.000Z",
    "status": "available",
    "notes": "Business laptop with 16GB RAM",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:00.000Z"
  }
}
```

### Update Laptop
```
PUT /laptops/:id
```

**Parameters:**
- `id` (string, required): Laptop ID (UUID)

**Request Body (all fields optional):**
```json
{
  "serialNumber": "ABC123456",
  "model": "ThinkPad X1 Carbon",
  "brand": "Lenovo",
  "purchaseDate": "2024-01-15T00:00:00Z",
  "warrantyExpiry": "2027-01-15T00:00:00Z",
  "status": "repair",
  "notes": "Screen replacement in progress"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "serialNumber": "ABC123456",
    "model": "ThinkPad X1 Carbon",
    "brand": "Lenovo",
    "purchaseDate": "2024-01-15T00:00:00.000Z",
    "warrantyExpiry": "2027-01-15T00:00:00.000Z",
    "status": "repair",
    "notes": "Screen replacement in progress",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:01.000Z"
  }
}
```

### Delete Laptop
```
DELETE /laptops/:id
```

**Parameters:**
- `id` (string, required): Laptop ID (UUID)

**Response (200):**
```json
{
  "success": true,
  "message": "Laptop deleted successfully"
}
```

---

## Staff Management

### Create Staff Member
```
POST /staff
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "department": "Engineering",
  "position": "Senior Developer",
  "joinDate": "2024-01-01T00:00:00Z",
  "phoneNumber": "+1-555-0100"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "department": "Engineering",
    "position": "Senior Developer",
    "joinDate": "2024-01-01T00:00:00.000Z",
    "phoneNumber": "+1-555-0100",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:00.000Z"
  }
}
```

### Get All Staff
```
GET /staff
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "department": "Engineering",
      "position": "Senior Developer",
      "joinDate": "2024-01-01T00:00:00.000Z",
      "phoneNumber": "+1-555-0100",
      "createdAt": "2024-02-06T12:00:00.000Z",
      "updatedAt": "2024-02-06T12:00:00.000Z"
    }
  ]
}
```

### Get Staff by ID
```
GET /staff/:id
```

**Parameters:**
- `id` (string, required): Staff ID (UUID)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "department": "Engineering",
    "position": "Senior Developer",
    "joinDate": "2024-01-01T00:00:00.000Z",
    "phoneNumber": "+1-555-0100",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:00.000Z"
  }
}
```

### Update Staff
```
PUT /staff/:id
```

**Parameters:**
- `id` (string, required): Staff ID (UUID)

**Request Body (all fields optional):**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "department": "Management",
  "position": "Engineering Manager",
  "joinDate": "2024-01-01T00:00:00Z",
  "phoneNumber": "+1-555-0101"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "department": "Management",
    "position": "Engineering Manager",
    "joinDate": "2024-01-01T00:00:00.000Z",
    "phoneNumber": "+1-555-0101",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:01.000Z"
  }
}
```

### Delete Staff
```
DELETE /staff/:id
```

**Parameters:**
- `id` (string, required): Staff ID (UUID)

**Response (200):**
```json
{
  "success": true,
  "message": "Staff deleted successfully"
}
```

---

## Asset Assignments

### Create Assignment
```
POST /assignments
```

**Request Body:**
```json
{
  "laptopId": "550e8400-e29b-41d4-a716-446655440000",
  "staffId": "660e8400-e29b-41d4-a716-446655440001",
  "assignedDate": "2024-02-06T00:00:00Z",
  "notes": "Assigned for project development"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "laptopId": "550e8400-e29b-41d4-a716-446655440000",
    "staffId": "660e8400-e29b-41d4-a716-446655440001",
    "assignedDate": "2024-02-06T00:00:00.000Z",
    "returnedDate": null,
    "notes": "Assigned for project development",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:00.000Z"
  }
}
```

### Get All Assignments
```
GET /assignments
```

**Query Parameters:**
- `active` (optional): Set to `true` to get only active (not returned) assignments

**Example:**
```
GET /assignments?active=true
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "laptopId": "550e8400-e29b-41d4-a716-446655440000",
      "staffId": "660e8400-e29b-41d4-a716-446655440001",
      "assignedDate": "2024-02-06T00:00:00.000Z",
      "returnedDate": null,
      "notes": "Assigned for project development",
      "createdAt": "2024-02-06T12:00:00.000Z",
      "updatedAt": "2024-02-06T12:00:00.000Z"
    }
  ]
}
```

### Get Assignment by ID
```
GET /assignments/:id
```

**Parameters:**
- `id` (string, required): Assignment ID (UUID)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "laptopId": "550e8400-e29b-41d4-a716-446655440000",
    "staffId": "660e8400-e29b-41d4-a716-446655440001",
    "assignedDate": "2024-02-06T00:00:00.000Z",
    "returnedDate": null,
    "notes": "Assigned for project development",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:00.000Z"
  }
}
```

### Return Laptop
```
PATCH /assignments/:id/return
```

**Parameters:**
- `id` (string, required): Assignment ID (UUID)

**Request Body:**
```json
{
  "returnedDate": "2024-02-13T00:00:00Z",
  "notes": "Device returned in good condition"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "laptopId": "550e8400-e29b-41d4-a716-446655440000",
    "staffId": "660e8400-e29b-41d4-a716-446655440001",
    "assignedDate": "2024-02-06T00:00:00.000Z",
    "returnedDate": "2024-02-13T00:00:00.000Z",
    "notes": "Device returned in good condition",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:01.000Z"
  }
}
```

### Delete Assignment
```
DELETE /assignments/:id
```

**Parameters:**
- `id` (string, required): Assignment ID (UUID)

**Response (200):**
```json
{
  "success": true,
  "message": "Assignment deleted successfully"
}
```

---

## Issue Tracking

### Create Issue
```
POST /issues
```

**Request Body:**
```json
{
  "laptopId": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Display flickering intermittently",
  "description": "The laptop display flickers occasionally, especially during video calls. Issue started 3 days ago.",
  "status": "open",
  "priority": "high",
  "reportedDate": "2024-02-05T14:00:00Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "laptopId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Display flickering intermittently",
    "description": "The laptop display flickers occasionally, especially during video calls. Issue started 3 days ago.",
    "status": "open",
    "priority": "high",
    "reportedDate": "2024-02-05T14:00:00.000Z",
    "resolvedDate": null,
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:00.000Z"
  }
}
```

### Get All Issues
```
GET /issues
```

**Query Parameters:**
- `status` (optional): Filter by status (open, in-progress, resolved, closed)

**Example:**
```
GET /issues?status=open
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "laptopId": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Display flickering intermittently",
      "description": "The laptop display flickers occasionally, especially during video calls. Issue started 3 days ago.",
      "status": "open",
      "priority": "high",
      "reportedDate": "2024-02-05T14:00:00.000Z",
      "resolvedDate": null,
      "createdAt": "2024-02-06T12:00:00.000Z",
      "updatedAt": "2024-02-06T12:00:00.000Z"
    }
  ]
}
```

### Get Issue by ID
```
GET /issues/:id
```

**Parameters:**
- `id` (string, required): Issue ID (UUID)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "laptopId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Display flickering intermittently",
    "description": "The laptop display flickers occasionally, especially during video calls. Issue started 3 days ago.",
    "status": "open",
    "priority": "high",
    "reportedDate": "2024-02-05T14:00:00.000Z",
    "resolvedDate": null,
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:00.000Z"
  }
}
```

### Update Issue
```
PUT /issues/:id
```

**Parameters:**
- `id` (string, required): Issue ID (UUID)

**Request Body (all fields optional):**
```json
{
  "status": "in-progress",
  "priority": "high",
  "resolvedDate": null
}
```

**Or when resolving:**
```json
{
  "status": "resolved",
  "resolvedDate": "2024-02-06T16:00:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "laptopId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Display flickering intermittently",
    "description": "The laptop display flickers occasionally, especially during video calls. Issue started 3 days ago.",
    "status": "resolved",
    "priority": "high",
    "reportedDate": "2024-02-05T14:00:00.000Z",
    "resolvedDate": "2024-02-06T16:00:00.000Z",
    "createdAt": "2024-02-06T12:00:00.000Z",
    "updatedAt": "2024-02-06T12:00:01.000Z"
  }
}
```

### Delete Issue
```
DELETE /issues/:id
```

**Parameters:**
- `id` (string, required): Issue ID (UUID)

**Response (200):**
```json
{
  "success": true,
  "message": "Issue deleted successfully"
}
```

---

## Error Examples

### Validation Error (400)
```json
{
  "success": false,
  "error": "Invalid input - email must be a valid email address"
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "error": "Laptop not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Field Enumerations

### Laptop Status
- `available` - Laptop is available for assignment
- `assigned` - Laptop is currently assigned to a staff member
- `repair` - Laptop is under maintenance/repair
- `lost` - Laptop is reported as lost
- `retired` - Laptop is no longer in use

### Issue Status
- `open` - Issue has been reported and is awaiting action
- `in-progress` - Issue is being worked on
- `resolved` - Issue has been fixed
- `closed` - Issue has been closed

### Issue Priority
- `low` - Low priority, can be addressed later
- `medium` - Normal priority
- `high` - High priority, should be addressed soon
- `critical` - Critical priority, requires immediate attention

---

## Rate Limiting

Currently, there is no rate limiting implemented. This will be added in future versions.

## Pagination

Currently, all GET endpoints return all available records. Pagination will be added in future versions.

## Filtering & Sorting

Currently, filtering is supported via query parameters for some endpoints. Sorting and advanced filtering will be added in future versions.
