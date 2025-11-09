import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Loader2, Scan, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { api, AlertItem } from '../api'
import { Html5Qrcode } from 'html5-qrcode'

export default function ContinuousConfirmationMode() {
  const [scanning, setScanning] = useState(false)
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([])
  const [unwantedIngredients, setUnwantedIngredients] = useState<string[]>([])
  const [newIngredient, setNewIngredient] = useState('')
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null)
  const [showResults, setShowResults] = useState(false)

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
        (decodedText) => {
          handleBarcodeScanned(decodedText)
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

  const handleBarcodeScanned = (barcode: string) => {
    if (!scannedBarcodes.includes(barcode)) {
      setScannedBarcodes(prev => [...prev, barcode])
    }
  }

  const removeBarcode = (barcode: string) => {
    setScannedBarcodes(prev => prev.filter(b => b !== barcode))
  }

  const addUnwantedIngredient = () => {
    if (newIngredient.trim() && !unwantedIngredients.includes(newIngredient.trim())) {
      setUnwantedIngredients(prev => [...prev, newIngredient.trim()])
      setNewIngredient('')
    }
  }

  const removeUnwantedIngredient = (ingredient: string) => {
    setUnwantedIngredients(prev => prev.filter(i => i !== ingredient))
  }

  const finishScanning = async () => {
    if (scannedBarcodes.length === 0) {
      setError('スキャンされた商品がありません')
      return
    }

    if (unwantedIngredients.length === 0) {
      setError('避けたい原料を設定してください')
      return
    }

    stopScanning()
    setLoading(true)
    setError(null)
    
    try {
      const alertResults = await api.checkBatch(scannedBarcodes, unwantedIngredients)
      setAlerts(alertResults)
      setShowResults(true)
    } catch (err) {
      setError('チェックに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setScannedBarcodes([])
    setAlerts([])
    setShowResults(false)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">連続確認モード</h2>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!showResults && (
        <>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">避けたい原料を設定</h3>
            <div className="flex gap-2 mb-3">
              <Input
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addUnwantedIngredient()}
                placeholder="例: 小麦、乳、卵"
                className="flex-1"
              />
              <Button onClick={addUnwantedIngredient} size="sm">追加</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {unwantedIngredients.length === 0 ? (
                <p className="text-sm text-gray-600">避けたい原料を追加してください</p>
              ) : (
                unwantedIngredients.map(ingredient => (
                  <Badge key={ingredient} variant="secondary" className="flex items-center gap-1">
                    {ingredient}
                    <X 
                      size={14} 
                      className="cursor-pointer hover:text-red-600" 
                      onClick={() => removeUnwantedIngredient(ingredient)}
                    />
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">
              スキャンした商品 ({scannedBarcodes.length})
            </h3>
            {scannedBarcodes.length === 0 ? (
              <p className="text-sm text-gray-600">まだ商品がスキャンされていません</p>
            ) : (
              <div className="space-y-2">
                {scannedBarcodes.map((barcode, index) => (
                  <div key={barcode} className="flex items-center justify-between bg-white p-2 rounded">
                    <span className="font-mono text-sm">
                      {index + 1}. {barcode}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removeBarcode(barcode)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!scanning && (
            <div className="flex gap-4 justify-center">
              <Button onClick={startScanning} size="lg" className="flex items-center gap-2">
                <Scan size={24} />
                スキャン開始
              </Button>
              {scannedBarcodes.length > 0 && (
                <Button onClick={finishScanning} size="lg" variant="default" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      チェック中...
                    </>
                  ) : (
                    'スキャン完了・チェック'
                  )}
                </Button>
              )}
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              <div id="reader" className="w-full"></div>
              <div className="flex gap-4 justify-center">
                <Button onClick={stopScanning} variant="outline">一時停止</Button>
                <Button onClick={finishScanning} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      チェック中...
                    </>
                  ) : (
                    'スキャン完了・チェック'
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {showResults && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-900">問題なし</AlertTitle>
              <AlertDescription className="text-green-800">
                スキャンした商品に避けたい原料は含まれていません
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>警告: 避けたい原料が含まれています</AlertTitle>
                <AlertDescription>
                  {alerts.length}個の商品に避けたい原料が含まれています
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.barcode} className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <h4 className="font-bold text-red-900 mb-2">{alert.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">バーコード: {alert.barcode}</p>
                    <div className="flex flex-wrap gap-2">
                      {alert.found_ingredients.map(ingredient => (
                        <Badge key={ingredient} variant="destructive">
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="text-center">
            <Button onClick={reset} size="lg">新しくスキャン</Button>
          </div>
        </div>
      )}
    </div>
  )
}
