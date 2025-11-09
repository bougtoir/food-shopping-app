from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
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
    async def search_items(
        session: AsyncSession, 
        query: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[FoodItem], int]:
        """Search items with pagination. Returns (items, total_count)"""
        stmt = select(FoodItemDB)
        count_stmt = select(func.count()).select_from(FoodItemDB)
        
        if query:
            search_filter = or_(
                FoodItemDB.barcode.ilike(f"%{query}%"),
                FoodItemDB.name.ilike(f"%{query}%")
            )
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)
        
        total_result = await session.execute(count_stmt)
        total = total_result.scalar()
        
        stmt = stmt.order_by(FoodItemDB.created_at.desc())
        stmt = stmt.offset((page - 1) * limit).limit(limit)
        result = await session.execute(stmt)
        db_items = result.scalars().all()
        
        items = [
            FoodItem(
                id=item.id,
                barcode=item.barcode,
                name=item.name,
                nutrition=NutritionInfo(**item.nutrition),
                ingredients=item.ingredients,
                allergens=item.allergens,
                additives=item.additives,
                created_at=item.created_at,
                updated_at=item.updated_at
            )
            for item in db_items
        ]
        
        return items, total
    
    @staticmethod
    async def item_exists(session: AsyncSession, barcode: str) -> bool:
        result = await session.execute(
            select(FoodItemDB).where(FoodItemDB.barcode == barcode)
        )
        return result.scalar_one_or_none() is not None
    
    @staticmethod
    async def delete_item(session: AsyncSession, barcode: str) -> bool:
        """Delete an item by barcode. Returns True if deleted, False if not found."""
        result = await session.execute(
            select(FoodItemDB).where(FoodItemDB.barcode == barcode)
        )
        db_item = result.scalar_one_or_none()
        
        if not db_item:
            return False
        
        await session.delete(db_item)
        await session.commit()
        return True

db_service = DatabaseService()
