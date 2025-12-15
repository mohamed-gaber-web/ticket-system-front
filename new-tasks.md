## Scope Module API Reference

The Scope module manages project or work scopes (e.g., Full Implementation, Partial Implementation, Consultation, Support).

### Base URL

```
http://localhost:5000/api/scopes
```

### Data Model

```typescript
{
  _id: string;
  name: string; // Required, unique
  isActive: boolean; // Default: true
  createdAt: Date;
  updatedAt: Date;
}
```

**Note:** Scope module does NOT have a description field.

### API Endpoints

#### 1. Create Scope

**Endpoint:** `POST /api/scopes`

**Request Body:**

```json
{
  "name": "Full Implementation",
  "isActive": true
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Scope created successfully",
  "data": {
    "_id": "6540abc123def456789",
    "name": "Full Implementation",
    "isActive": true,
    "createdAt": "2025-12-14T10:30:00.000Z",
    "updatedAt": "2025-12-14T10:30:00.000Z",
    "__v": 0
  }
}
```

**Error Response (400 - Validation Error):**

```json
{
  "success": false,
  "message": "Scope name is required"
}
```

**Error Response (400 - Duplicate Name):**

```json
{
  "success": false,
  "message": "Scope name already exists",
  "field": "name"
}
```

#### 2. Get All Scopes

**Endpoint:** `GET /api/scopes`

**Query Parameters:**

- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page
- `search` (string) - Search by name
- `isActive` (boolean) - Filter by active status

**Request Examples:**

```
GET /api/scopes
GET /api/scopes?page=1&limit=20
GET /api/scopes?search=implementation
GET /api/scopes?isActive=true
GET /api/scopes?page=2&limit=10&isActive=true&search=support
```

**Success Response (200):**

```json
{
  "success": true,
  "count": 4,
  "total": 4,
  "page": 1,
  "totalPages": 1,
  "data": [
    {
      "_id": "6540abc123def456789",
      "name": "Full Implementation",
      "isActive": true,
      "createdAt": "2025-12-14T10:30:00.000Z",
      "updatedAt": "2025-12-14T10:30:00.000Z",
      "__v": 0
    },
    {
      "_id": "6540abc123def456790",
      "name": "Partial Implementation",
      "isActive": true,
      "createdAt": "2025-12-14T10:31:00.000Z",
      "updatedAt": "2025-12-14T10:31:00.000Z",
      "__v": 0
    },
    {
      "_id": "6540abc123def456791",
      "name": "Consultation",
      "isActive": true,
      "createdAt": "2025-12-14T10:32:00.000Z",
      "updatedAt": "2025-12-14T10:32:00.000Z",
      "__v": 0
    },
    {
      "_id": "6540abc123def456792",
      "name": "Support Only",
      "isActive": false,
      "createdAt": "2025-12-14T10:33:00.000Z",
      "updatedAt": "2025-12-14T10:33:00.000Z",
      "__v": 0
    }
  ]
}
```

#### 3. Get Scope by ID

**Endpoint:** `GET /api/scopes/:id`

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "_id": "6540abc123def456789",
    "name": "Full Implementation",
    "isActive": true,
    "createdAt": "2025-12-14T10:30:00.000Z",
    "updatedAt": "2025-12-14T10:30:00.000Z",
    "__v": 0
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Scope not found"
}
```

#### 4. Update Scope

**Endpoint:** `PATCH /api/scopes/:id`

**Allowed Fields:** `name`, `isActive`

**Request Body:**

```json
{
  "name": "Full System Implementation",
  "isActive": true
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Scope updated successfully",
  "data": {
    "_id": "6540abc123def456789",
    "name": "Full System Implementation",
    "isActive": true,
    "createdAt": "2025-12-14T10:30:00.000Z",
    "updatedAt": "2025-12-14T11:00:00.000Z",
    "__v": 0
  }
}
```

**Error Response (400 - Invalid Field):**

```json
{
  "success": false,
  "message": "Invalid updates!",
  "allowedFields": ["name", "isActive"]
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Scope not found"
}
```

#### 5. Delete Scope

**Endpoint:** `DELETE /api/scopes/:id`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Scope deleted successfully",
  "data": {
    "_id": "6540abc123def456789",
    "name": "Full Implementation",
    "isActive": true,
    "createdAt": "2025-12-14T10:30:00.000Z",
    "updatedAt": "2025-12-14T10:30:00.000Z",
    "__v": 0
  }
}
```

**Error Response (404):**

```json
{
  "success": false,
  "message": "Scope not found"
}
```

#### 6. Toggle Scope Status

**Endpoint:** `PATCH /api/scopes/:id/toggle-status`

**Request:** No body required

**Success Response (200 - Activated):**

```json
{
  "success": true,
  "message": "Scope activated successfully",
  "data": {
    "_id": "6540abc123def456789",
    "name": "Full Implementation",
    "isActive": true,
    "createdAt": "2025-12-14T10:30:00.000Z",
    "updatedAt": "2025-12-14T11:15:00.000Z",
    "__v": 0
  }
}
```

**Success Response (200 - Deactivated):**

```json
{
  "success": true,
  "message": "Scope deactivated successfully",
  "data": {
    "_id": "6540abc123def456789",
    "name": "Full Implementation",
    "isActive": false,
    "createdAt": "2025-12-14T10:30:00.000Z",
    "updatedAt": "2025-12-14T11:15:00.000Z",
    "__v": 0
  }
}
```

---

## Environment Variables

| Variable            | Description               | Default     | Required |
| ------------------- | ------------------------- | ----------- | -------- |
| `NODE_ENV`          | Environment mode          | development | No       |
| `PORT`              | Server port               | 5000        | No       |
| `MONGO_URI`         | MongoDB connection string | -           | Yes      |
| `JWT_SECRET`        | Secret key for JWT        | -           | Yes      |
| `JWT_EXPIRE`        | JWT expiration            | 7d          | No       |
| `JWT_COOKIE_EXPIRE` | Cookie expiration (days)  | 7           | No       |
| `CLIENT_URL`        | Frontend URL              | -           | No       |

---

## Support & Documentation

- **Swagger UI**: `http://localhost:5000/api-docs`
- **Check this README** for quick reference
- **Contact**: Development Team

---

## License

Proprietary - All rights reserved
