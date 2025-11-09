from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import FoodItem, NutritionInfo
from app.db_models import FoodItemDB
from datetime import datetime
import uuid

class DatabaseService:
    @staticmethod
    async def add_item(session: AsyncSession, item_data: dict) -> FoodItem:
        db_item = FoodItemDB(
            id=str(uuid.uuid4()),
            barcode=item_data["barcode"],
            name=item_data["name"],
            nutrition=item_data["nutrition"],
            ingredients=item_data["ingredients"],
            allergens=item_data["allergens"],
            additives=item_data["additives"]
        )
        session.add(db_item)
        await session.commit()
        await session.refresh(db_item)
        
        return FoodItem(
            id=db_item.id,
            barcode=db_item.barcode,
            name=db_item.name,
            nutrition=NutritionInfo(**db_item.nutrition),
            ingredients=db_item.ingredients,
            allergens=db_item.allergens,
            additives=db_item.additives,
            created_at=db_item.created_at,
            updated_at=db_item.updated_at
        )
    
    @staticmethod
    async def get_item_by_barcode(session: AsyncSession, barcode: str) -> Optional[FoodItem]:
        result = await session.execute(
            select(FoodItemDB).where(FoodItemDB.barcode == barcode)
        )
        db_item = result.scalar_one_or_none()
        
        if not db_item:
            return None
        
        return FoodItem(
            id=db_item.id,
            barcode=db_item.barcode,
            name=db_item.name,
            nutrition=NutritionInfo(**db_item.nutrition),
            ingredients=db_item.ingredients,
            allergens=db_item.allergens,
            additives=db_item.additives,
            created_at=db_item.created_at,
            updated_at=db_item.updated_at
        )
    
    @staticmethod
    async def get_all_items(session: AsyncSession) -> List[dict]:
        result = await session.execute(select(FoodItemDB))
        db_items = result.scalars().all()
        
        return [
            {"id": item.id, "barcode": item.barcode, "name": item.name}
            for item in db_items
        ]
    
    @staticmethod
    async def item_exists(session: AsyncSession, barcode: str) -> bool:
        result = await session.execute(
            select(FoodItemDB).where(FoodItemDB.barcode == barcode)
        )
        return result.scalar_one_or_none() is not None

db_service = DatabaseService()
