from fastapi import FastAPI, HTTPException, Depends, Query
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from contextlib import asynccontextmanager
from app.models import (
    FoodItem, RegisterItemRequest, OCRRequest, OCRResponse,
    CheckBatchRequest, CheckBatchResponse, AlertItem, ItemDetail, NutritionInfo,
    SearchItemsResponse
)
from app.database import db_service
from app.db_config import get_db, init_db
from app.ocr_service import ocr_service
from datetime import datetime
import uuid

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(lifespan=lifespan)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/items/register", response_model=FoodItem)
async def register_item(request: RegisterItemRequest, session: AsyncSession = Depends(get_db)):
    
    if await db_service.item_exists(session, request.barcode):
        raise HTTPException(status_code=400, detail="Item with this barcode already exists")
    
    item_data = {
        "barcode": request.barcode,
        "name": request.name,
        "nutrition": request.nutrition.model_dump(),
        "ingredients": request.ingredients,
        "allergens": request.allergens,
        "additives": request.additives
    }
    
    item = await db_service.add_item(session, item_data)
    return item

@app.post("/api/items/ocr", response_model=OCRResponse)
async def process_ocr(request: OCRRequest):
    """Process image with AI OCR to extract nutrition information"""
    try:
        result = await ocr_service.process_image(request.image)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@app.get("/api/items/{barcode}", response_model=FoodItem)
async def get_item(barcode: str, session: AsyncSession = Depends(get_db)):
    item = await db_service.get_item_by_barcode(session, barcode)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.post("/api/items/check-batch", response_model=CheckBatchResponse)
async def check_batch(request: CheckBatchRequest, session: AsyncSession = Depends(get_db)):
    alerts = []
    items = []
    unknown_barcodes = []
    
    for barcode in request.barcodes:
        item = await db_service.get_item_by_barcode(session, barcode)
        if not item:
            unknown_barcodes.append(barcode)
            continue
        
        items.append(ItemDetail(
            barcode=item.barcode,
            name=item.name,
            ingredients=item.ingredients,
            allergens=item.allergens,
            additives=item.additives,
            is_registered=True
        ))
        
        if request.unwanted_ingredients:
            all_components = item.ingredients + item.allergens + item.additives
            found_ingredients = []
            
            for unwanted in request.unwanted_ingredients:
                unwanted_lower = unwanted.lower()
                for component in all_components:
                    if unwanted_lower in component.lower():
                        found_ingredients.append(component)
            
            if found_ingredients:
                alerts.append(AlertItem(
                    barcode=item.barcode,
                    name=item.name,
                    found_ingredients=list(set(found_ingredients))
                ))
    
    return CheckBatchResponse(alerts=alerts, items=items, unknown_barcodes=unknown_barcodes)

@app.get("/api/items", response_model=SearchItemsResponse)
async def search_items(
    q: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    session: AsyncSession = Depends(get_db)
):
    """Search items with optional query and pagination"""
    if page < 1:
        page = 1
    if limit < 1 or limit > 100:
        limit = 20
    
    items, total = await db_service.search_items(session, q, page, limit)
    total_pages = (total + limit - 1) // limit
    
    return SearchItemsResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@app.get("/api/items/exists/{barcode}")
async def check_item_exists(barcode: str, session: AsyncSession = Depends(get_db)):
    exists = await db_service.item_exists(session, barcode)
    return {"exists": exists, "barcode": barcode}
