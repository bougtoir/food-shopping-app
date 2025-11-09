# Food Shopping App API Design

## Requirements
- Data Registration Mode: Capture barcode and nutrition label photos, use AI OCR to extract and register data
- Information Confirmation Mode: Read barcode and display registered information
- Continuous Confirmation Mode: Read multiple barcodes, then check for unwanted ingredients (allergens, additives)
- Default startup: Information Confirmation Mode in Continuous mode

## Backend API Endpoints

### 1. POST /api/items/register
Register a new food item with barcode and nutrition information
- Request: { barcode: string, images: [base64], nutrition_data?: object }
- Response: { id: string, barcode: string, name: string, nutrition: object, ingredients: [] }

### 2. POST /api/items/ocr
Process images with AI OCR to extract nutrition information
- Request: { images: [base64] }
- Response: { barcode?: string, nutrition: object, ingredients: [], raw_text: string }

### 3. GET /api/items/{barcode}
Get food item by barcode
- Response: { id: string, barcode: string, name: string, nutrition: object, ingredients: [] }

### 4. POST /api/items/check-batch
Check multiple items for unwanted ingredients
- Request: { barcodes: [string], unwanted_ingredients: [string] }
- Response: { alerts: [{ barcode: string, name: string, found_ingredients: [string] }] }

### 5. GET /api/items
List all registered items
- Response: [{ id: string, barcode: string, name: string }]

## Data Model

### FoodItem
- id: string (UUID)
- barcode: string (unique)
- name: string
- nutrition: object (calories, protein, fat, carbs, etc.)
- ingredients: array of strings
- allergens: array of strings
- additives: array of strings
- created_at: datetime
- updated_at: datetime

## Frontend Features

### Data Registration Mode
- Camera interface for capturing barcode and nutrition label
- Can capture separately or together
- Send to AI OCR endpoint for processing
- Display extracted data for confirmation
- Save to database

### Information Confirmation Mode (Single)
- Barcode scanner interface
- Display registered information if found
- Prompt to register if not found

### Continuous Confirmation Mode (Default)
- Barcode scanner interface
- Collect multiple barcodes
- "Finish Scanning" button
- User configures unwanted ingredients
- Display alerts for items containing unwanted ingredients

## Technology Stack
- Backend: FastAPI (Python)
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Database: In-memory (for POC)
- Barcode Scanning: html5-qrcode library
- Camera: MediaDevices API
- AI OCR: OpenAI Vision API or similar
