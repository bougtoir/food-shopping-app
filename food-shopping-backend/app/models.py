from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

class NutritionInfo(BaseModel):
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbohydrates: Optional[float] = None
    sodium: Optional[float] = None
    sugar: Optional[float] = None
    fiber: Optional[float] = None

class FoodItem(BaseModel):
    id: str
    barcode: str
    name: str
    nutrition: NutritionInfo
    ingredients: List[str]
    allergens: List[str]
    additives: List[str]
    created_at: datetime
    updated_at: datetime

class RegisterItemRequest(BaseModel):
    barcode: str
    name: str
    nutrition: NutritionInfo
    ingredients: List[str]
    allergens: List[str] = []
    additives: List[str] = []

class OCRRequest(BaseModel):
    image: str  # base64 encoded image

class OCRResponse(BaseModel):
    barcode: Optional[str] = None
    name: Optional[str] = None
    nutrition: NutritionInfo
    ingredients: List[str]
    allergens: List[str]
    additives: List[str]
    raw_text: str

class CheckBatchRequest(BaseModel):
    barcodes: List[str]
    unwanted_ingredients: List[str]

class AlertItem(BaseModel):
    barcode: str
    name: str
    found_ingredients: List[str]

class CheckBatchResponse(BaseModel):
    alerts: List[AlertItem]
