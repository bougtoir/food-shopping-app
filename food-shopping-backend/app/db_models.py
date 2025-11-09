from sqlalchemy import Column, String, Float, JSON, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class FoodItemDB(Base):
    __tablename__ = "food_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    barcode = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    nutrition = Column(JSON, nullable=False)
    ingredients = Column(JSON, nullable=False)
    allergens = Column(JSON, nullable=False)
    additives = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
