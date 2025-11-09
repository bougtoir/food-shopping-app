import base64
import os
from typing import Optional
from openai import OpenAI
from app.models import OCRResponse, NutritionInfo
import re

class OCRService:
    def __init__(self):
        self.client = None
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            self.client = OpenAI(api_key=api_key)
    
    async def process_image(self, base64_image: str) -> OCRResponse:
        """Process image with AI OCR to extract nutrition information"""
        
        if not self.client:
            return self._mock_ocr_response()
        
        try:
            if "," in base64_image:
                base64_image = base64_image.split(",")[1]
            
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """この画像から以下の情報を抽出してください:
1. バーコード番号（あれば）
2. 商品名
3. 栄養成分（カロリー、タンパク質、脂質、炭水化物、ナトリウム、糖質、食物繊維など）
4. 原材料リスト
5. アレルゲン情報
6. 添加物

JSON形式で返してください:
{
  "barcode": "バーコード番号またはnull",
  "name": "商品名",
  "nutrition": {
    "calories": カロリー(kcal),
    "protein": タンパク質(g),
    "fat": 脂質(g),
    "carbohydrates": 炭水化物(g),
    "sodium": ナトリウム(mg),
    "sugar": 糖質(g),
    "fiber": 食物繊維(g)
  },
  "ingredients": ["原材料1", "原材料2", ...],
  "allergens": ["アレルゲン1", "アレルゲン2", ...],
  "additives": ["添加物1", "添加物2", ...],
  "raw_text": "画像から読み取った全テキスト"
}

数値が見つからない場合はnullを返してください。"""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            
            import json
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = json.loads(content)
            
            return OCRResponse(
                barcode=data.get("barcode"),
                name=data.get("name", "不明"),
                nutrition=NutritionInfo(**data.get("nutrition", {})),
                ingredients=data.get("ingredients", []),
                allergens=data.get("allergens", []),
                additives=data.get("additives", []),
                raw_text=data.get("raw_text", "")
            )
            
        except Exception as e:
            print(f"OCR Error: {e}")
            return self._mock_ocr_response()
    
    def _mock_ocr_response(self) -> OCRResponse:
        """Return mock OCR response for testing without API key"""
        return OCRResponse(
            barcode="4901234567890",
            name="サンプル商品",
            nutrition=NutritionInfo(
                calories=200.0,
                protein=5.0,
                fat=10.0,
                carbohydrates=25.0,
                sodium=500.0,
                sugar=15.0,
                fiber=2.0
            ),
            ingredients=["小麦粉", "砂糖", "植物油脂", "食塩"],
            allergens=["小麦"],
            additives=["乳化剤", "香料"],
            raw_text="Mock OCR response - OPENAI_API_KEY not configured"
        )

ocr_service = OCRService()
