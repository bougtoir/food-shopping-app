import { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Badge } from './ui/badge'
import { Loader2, Scan, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { api, CheckBatchResult } from '../api'
import { Html5Qrcode } from 'html5-qrcode'

const READER_ID = 'reader-continuous'

export default function ContinuousConfirmationMode() {
  const [scanning, setScanning] = useState(false)
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([])
  const [unwantedIngredients, setUnwantedIngredients] = useState<string[]>([])
  const [newIngredient, setNewIngredient] = useState('')
  const [result, setResult] = useState<CheckBatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  useEffect(() => {
    if (!scanning) return

    const startScanner = async () => {
      try {
        if (!window.isSecureContext) {
          setError('カメラアクセスにはHTTPS接続が必要です')
          setScanning(false)
          return
        }
        
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('お使いのブラウザはカメラアクセスに対応していません')
          setScanning(false)
          return
        }

        await new Promise(r => requestAnimationFrame(() => r(null)))
        
        if (!document.getElementById(READER_ID)) {
          setError('スキャナー領域の初期化に失敗しました')
          setScanning(false)
          return
        }

        const html5QrCode = new Html5Qrcode(READER_ID)
        scannerRef.current = html5QrCode
        
        try {
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
          setError(null)
        } catch (facingModeErr: any) {
          console.log('facingMode failed, trying deviceId approach', facingModeErr)
          
          try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices.filter(d => d.kind === 'videoinput')
            
            if (videoDevices.length === 0) {
              throw new Error('カメラが見つかりません')
            }
            
            const backCamera = videoDevices.find(d => 
              /back|rear|environment/i.test(d.label)
            ) || videoDevices[videoDevices.length - 1]
            
            await html5QrCode.start(
              { deviceId: { exact: backCamera.deviceId } },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 }
              },
              (decodedText) => {
                handleBarcodeScanned(decodedText)
              },
              () => {}
            )
            setError(null)
          } catch (deviceErr: any) {
            await html5QrCode.start(
              { facingMode: 'user' },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 }
              },
              (decodedText) => {
                handleBarcodeScanned(decodedText)
              },
              () => {}
            )
            setError(null)
          }
        }
      } catch (err: any) {
        const errorName = err?.name || 'Error'
        const errorMsg = err?.message || String(err)
        console.error('[Camera Error]', errorName, errorMsg, err)
        
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          setError('カメラの使用が拒否されました。ブラウザの設定でカメラへのアクセスを許可してください')
        } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
          setError('カメラが見つかりません')
        } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
          setError('カメラが他のアプリで使用中です')
        } else if (errorName === 'OverconstrainedError') {
          setError('カメラの設定に問題があります')
        } else if (errorName === 'SecurityError') {
          setError('セキュリティエラー: カメラへのアクセスがブロックされています')
        } else {
          setError(`カメラエラー: ${errorName} - ${errorMsg}`)
        }
        setScanning(false)
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current?.clear()
            scannerRef.current = null
          })
      }
    }
  }, [scanning])

  const startScanning = () => {
    setScanning(true)
  }

  const stopScanning = () => {
    setScanning(false)
  }

  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcodes(prev => prev.includes(barcode) ? prev : [...prev, barcode])
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

    stopScanning()
    setLoading(true)
    setError(null)
    
    try {
      const batchResult = await api.checkBatch(scannedBarcodes, unwantedIngredients)
      setResult(batchResult)
      setShowResults(true)
    } catch (err) {
      setError('チェックに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setScannedBarcodes([])
    setResult(null)
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
            <h3 className="font-semibold text-blue-900 mb-2">避けたい原料を設定（任意）</h3>
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
                <p className="text-sm text-gray-600">設定なし（すべての原材料を表示します）</p>
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

          <div id={READER_ID} className={scanning ? 'w-full' : 'w-full hidden'}></div>

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
          )}
        </>
      )}

      {showResults && result && (
        <div className="space-y-4">
          {result.unknown_barcodes.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>未登録の商品があります</AlertTitle>
              <AlertDescription>
                {result.unknown_barcodes.length}個の商品が未登録です。データ登録モードで登録してください。
                <div className="mt-2 space-y-1">
                  {result.unknown_barcodes.map(barcode => (
                    <div key={barcode} className="font-mono text-sm">• {barcode}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {unwantedIngredients.length > 0 && result.alerts.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>警告: 避けたい原料が含まれています</AlertTitle>
              <AlertDescription>
                {result.alerts.length}個の商品に避けたい原料が含まれています
              </AlertDescription>
            </Alert>
          )}

          {unwantedIngredients.length > 0 && result.alerts.length === 0 && result.unknown_barcodes.length === 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertTitle className="text-green-900">問題なし</AlertTitle>
              <AlertDescription className="text-green-800">
                スキャンした商品に避けたい原料は含まれていません
              </AlertDescription>
            </Alert>
          )}

          {result.items.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">商品情報</h3>
              {result.items.map((item) => {
                const hasAlert = result.alerts.some(a => a.barcode === item.barcode)
                return (
                  <div 
                    key={item.barcode} 
                    className={`rounded-lg p-4 ${hasAlert ? 'bg-red-50 border-2 border-red-300' : 'bg-gray-50 border border-gray-200'}`}
                  >
                    <h4 className={`font-bold mb-2 ${hasAlert ? 'text-red-900' : 'text-gray-900'}`}>
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">バーコード: {item.barcode}</p>
                    
                    {hasAlert && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-red-900 mb-1">避けたい原料:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.alerts.find(a => a.barcode === item.barcode)?.found_ingredients.map(ingredient => (
                            <Badge key={ingredient} variant="destructive">
                              {ingredient}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      {item.ingredients.length > 0 && (
                        <div>
                          <span className="font-semibold">原材料: </span>
                          <span className="text-gray-700">{item.ingredients.join('、')}</span>
                        </div>
                      )}
                      {item.allergens.length > 0 && (
                        <div>
                          <span className="font-semibold">アレルゲン: </span>
                          <span className="text-gray-700">{item.allergens.join('、')}</span>
                        </div>
                      )}
                      {item.additives.length > 0 && (
                        <div>
                          <span className="font-semibold">添加物: </span>
                          <span className="text-gray-700">{item.additives.join('、')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="text-center">
            <Button onClick={reset} size="lg">新しくスキャン</Button>
          </div>
        </div>
      )}
    </div>
  )
}
