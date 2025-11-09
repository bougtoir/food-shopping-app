const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface NutritionInfo {
  calories?: number
  protein?: number
  fat?: number
  carbohydrates?: number
  sodium?: number
  sugar?: number
  fiber?: number
}

export interface FoodItem {
  id: string
  barcode: string
  name: string
  nutrition: NutritionInfo
  ingredients: string[]
  allergens: string[]
  additives: string[]
  created_at: string
  updated_at: string
}

export interface OCRResponse {
  barcode?: string
  name?: string
  nutrition: NutritionInfo
  ingredients: string[]
  allergens: string[]
  additives: string[]
  raw_text: string
}

export interface AlertItem {
  barcode: string
  name: string
  found_ingredients: string[]
}

export const api = {
  async registerItem(data: {
    barcode: string
    name: string
    nutrition: NutritionInfo
    ingredients: string[]
    allergens: string[]
    additives: string[]
  }): Promise<FoodItem> {
    const response = await fetch(`${API_URL}/api/items/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to register item')
    }
    return response.json()
  },

  async processOCR(image: string): Promise<OCRResponse> {
    const response = await fetch(`${API_URL}/api/items/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    })
    if (!response.ok) {
      throw new Error('Failed to process OCR')
    }
    return response.json()
  },

  async getItem(barcode: string): Promise<FoodItem> {
    const response = await fetch(`${API_URL}/api/items/${barcode}`)
    if (!response.ok) {
      throw new Error('Item not found')
    }
    return response.json()
  },

  async checkItemExists(barcode: string): Promise<boolean> {
    const response = await fetch(`${API_URL}/api/items/exists/${barcode}`)
    const data = await response.json()
    return data.exists
  },

  async checkBatch(barcodes: string[], unwantedIngredients: string[]): Promise<AlertItem[]> {
    const response = await fetch(`${API_URL}/api/items/check-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        barcodes,
        unwanted_ingredients: unwantedIngredients,
      }),
    })
    if (!response.ok) {
      throw new Error('Failed to check batch')
    }
    const data = await response.json()
    return data.alerts
  },

  async listItems(): Promise<{ id: string; barcode: string; name: string }[]> {
    const response = await fetch(`${API_URL}/api/items`)
    return response.json()
  },
}
