import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, Scan } from 'lucide-react'
import { api, FoodItem } from '../api'
import { Html5Qrcode } from 'html5-qrcode'

export default function InformationConfirmationMode() {
  const [scanning, setScanning] = useState(false)
  const [item, setItem] = useState<FoodItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null)

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.stop().catch(() => {})
      }
    }
  }, [scanner])

  const startScanning = async () => {
    try {
      const html5QrCode = new Html5Qrcode('reader')
      setScanner(html5QrCode)
      
      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText) => {
          await handleBarcodeScanned(decodedText)
          html5QrCode.stop()
          setScanning(false)
        },
        () => {}
      )
      
      setScanning(true)
      setError(null)
    } catch (err) {
      setError('カメラへのアクセスに失敗しました')
    }
  }

  const stopScanning = () => {
    if (scanner) {
      scanner.stop().then(() => {
        setScanning(false)
      }).catch(() => {})
    }
  }

  const handleBarcodeScanned = async (barcode: string) => {
    setLoading(true)
    setError(null)
    setItem(null)
    
    try {
      const exists = await api.checkItemExists(barcode)
      
      if (exists) {
        const itemData = await api.getItem(barcode)
        setItem(itemData)
      } else {
        setError('この商品は登録されていません。データ登録モードで登録してください。')
      }
    } catch (err) {
      setError('商品情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">個別確認モード</h2>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!scanning && !item && (
        <div className="text-center">
          <Button onClick={startScanning} size="lg" className="flex items-center gap-2 mx-auto">
            <Scan size={24} />
            バーコードをスキャン
          </Button>
        </div>
      )}

      {scanning && (
        <div className="space-y-4">
          <div id="reader" className="w-full"></div>
          <div className="text-center">
            <Button onClick={stopScanning} variant="outline">スキャン停止</Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      )}

      {item && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg border-2 border-indigo-200">
            <h3 className="text-2xl font-bold text-indigo-900 mb-4">{item.name}</h3>
            
            <div className="space-y-3">
              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600">バーコード</p>
                <p className="font-mono font-bold">{item.barcode}</p>
              </div>

              <div className="bg-white p-3 rounded">
                <p className="text-sm text-gray-600 mb-2">栄養成分</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">カロリー:</span>
                    <span className="font-semibold ml-1">{item.nutrition.calories || '-'} kcal</span>
                  </div>
                  <div>
                    <span className="text-gray-600">タンパク質:</span>
                    <span className="font-semibold ml-1">{item.nutrition.protein || '-'} g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">脂質:</span>
                    <span className="font-semibold ml-1">{item.nutrition.fat || '-'} g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">炭水化物:</span>
                    <span className="font-semibold ml-1">{item.nutrition.carbohydrates || '-'} g</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ナトリウム:</span>
                    <span className="font-semibold ml-1">{item.nutrition.sodium || '-'} mg</span>
                  </div>
                  <div>
                    <span className="text-gray-600">糖質:</span>
                    <span className="font-semibold ml-1">{item.nutrition.sugar || '-'} g</span>
                  </div>
                </div>
              </div>

              {item.ingredients.length > 0 && (
                <div className="bg-white p-3 rounded">
                  <p className="text-sm text-gray-600 mb-1">原材料</p>
                  <p className="text-sm">{item.ingredients.join(', ')}</p>
                </div>
              )}

              {item.allergens.length > 0 && (
                <div className="bg-white p-3 rounded border-2 border-orange-200">
                  <p className="text-sm text-orange-700 font-semibold mb-1">アレルゲン</p>
                  <p className="text-sm font-semibold text-orange-900">{item.allergens.join(', ')}</p>
                </div>
              )}

              {item.additives.length > 0 && (
                <div className="bg-white p-3 rounded">
                  <p className="text-sm text-gray-600 mb-1">添加物</p>
                  <p className="text-sm">{item.additives.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <Button onClick={() => { setItem(null); startScanning(); }}>
              次の商品をスキャン
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
