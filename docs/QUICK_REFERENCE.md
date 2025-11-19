# Cellerhut API Quick Reference

## Base URL

```
https://cellerhut-api.vercel.app
```

## Authentication

All protected endpoints require:

```
Authorization: Bearer {jwt_token}
```

## Quick Endpoint Reference

### Authentication

| Method | Endpoint               | Description       |
| ------ | ---------------------- | ----------------- |
| POST   | `/auth/register`       | Register new user |
| POST   | `/auth/login`          | User login        |
| GET    | `/auth/profile`        | Get user profile  |
| POST   | `/auth/addresses`      | Add address       |
| PUT    | `/auth/addresses/{id}` | Update address    |
| DELETE | `/auth/addresses/{id}` | Delete address    |

### Products

| Method | Endpoint         | Description              | Query Params                                    |
| ------ | ---------------- | ------------------------ | ----------------------------------------------- |
| GET    | `/products`      | Get products (paginated) | `page`, `limit`, `search`, `category`, `status` |
| GET    | `/products/{id}` | Get single product       | -                                               |

### Categories

| Method | Endpoint      | Description        |
| ------ | ------------- | ------------------ |
| GET    | `/categories` | Get all categories |

### Orders

| Method | Endpoint       | Description            | Auth Required |
| ------ | -------------- | ---------------------- | ------------- |
| POST   | `/orders`      | Create order from cart | ✅            |
| GET    | `/orders`      | Get user orders        | ✅            |
| GET    | `/orders/{id}` | Get single order       | ✅            |

## Response Format

### Success Response

```json
{
	"status": "success",
	"message": "Operation successful",
	"data": {
		/* response data */
	}
}
```

### Error Response

```json
{
	"status": "error",
	"message": "Error description",
	"errors": {
		"field_name": ["Error message"]
	}
}
```

## Key Data Structures

### Product Object

```json
{
	"id": 1,
	"name": "Product Name",
	"slug": "product-name",
	"description": "Product description",
	"image": {
		"id": 1,
		"original": "https://cdn.cellerhut.com/products/image.jpg",
		"thumbnail": "https://cdn.cellerhut.com/products/thumbs/image.jpg"
	},
	"price": 450.0,
	"sale_price": 399.0,
	"quantity": 24,
	"in_stock": true,
	"status": "publish",
	"alcohol_content": 14.5,
	"volume": "750ml",
	"origin": "South Africa",
	"vintage": 2020,
	"tasting_notes": ["berry", "spice"],
	"food_pairings": ["meat", "cheese"],
	"category": {
		"id": 11,
		"name": "Red Wines",
		"slug": "red-wines"
	}
}
```

### Order Object

```json
{
	"id": 1001,
	"tracking_number": "CLH-1705665000123",
	"order_status": "order-processing",
	"payment_status": "payment-success",
	"total": 1033.85,
	"sales_tax": 134.85,
	"delivery_fee": 50.0,
	"customer": {
		"id": 1,
		"name": "John Doe",
		"email": "john@example.com"
	},
	"products": [
		{
			"id": 1,
			"name": "Product Name",
			"pivot": {
				"order_quantity": 2,
				"unit_price": 399.0,
				"subtotal": 798.0
			}
		}
	]
}
```

### User Object

```json
{
	"id": 1,
	"name": "John Doe",
	"email": "john@example.com",
	"is_active": true,
	"profile": {
		"avatar": "https://cdn.cellerhut.com/avatars/user1.jpg",
		"phone": "+27123456789"
	},
	"address": [
		{
			"id": 1,
			"street": "123 Main Road",
			"city": "Cape Town",
			"province": "Western Cape",
			"postal_code": "8001",
			"is_default": true
		}
	],
	"permissions": [
		{
			"id": 1,
			"name": "customer",
			"guard_name": "api"
		}
	]
}
```

## Pagination Structure

```json
{
	"data": [
		/* array of items */
	],
	"count": 15,
	"current_page": 1,
	"last_page": 5,
	"per_page": 15,
	"total": 73,
	"first_page_url": "https://api.cellerhut.com/products?page=1",
	"last_page_url": "https://api.cellerhut.com/products?page=5",
	"next_page_url": "https://api.cellerhut.com/products?page=2",
	"prev_page_url": null,
	"from": 1,
	"to": 15
}
```

## Status Enums

### Order Status

- `order-pending`
- `order-processing`
- `order-at-local-facility`
- `order-out-for-delivery`
- `order-completed`
- `order-cancelled`
- `order-refunded`

### Payment Status

- `payment-pending`
- `payment-success`
- `payment-failed`
- `payment-refunded`

## HTTP Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## Rate Limits

- General: 100 req/min per IP
- Auth: 5 req/min per IP
- Orders: 10 req/min per user

---

For complete documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
