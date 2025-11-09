import { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, Scan, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { api, FoodItem } from '../api'
import { Html5Qrcode } from 'html5-qrcode'
import { Input } from './ui/input'

const READER_ID = 'reader-information'

export default function InformationConfirmationMode() {
  const [scanning, setScanning] = useState(false)
  const [item, setItem] = useState<FoodItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  
  const [showBrowse, setShowBrowse] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoodItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

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
        await new Promise(r => setTimeout(() => r(null), 100))
        
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
            async (decodedText) => {
              await handleBarcodeScanned(decodedText)
              setScanning(false)
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
              async (decodedText) => {
                await handleBarcodeScanned(decodedText)
                setScanning(false)
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
              async (decodedText) => {
                await handleBarcodeScanned(decodedText)
                setScanning(false)
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

  const handleBarcodeScanned = async (barcode: string) => {
    setLoading(true)
    setError(null)
    setItem(null)
    
    try {
      const exists = await api.checkItemExists(barcode)
      
      if (exists) {
        const itemData = await api.getItem(barcode)
        setItem(itemData)
        setShowBrowse(false)
      } else {
        setError('この商品は登録されていません。データ登録モードで登録してください。')
      }
    } catch (err) {
      setError('商品情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (page: number = 1) => {
    setSearchLoading(true)
    setError(null)
    try {
      const result = await api.searchItems(searchQuery || undefined, page, 20)
      setSearchResults(result.items)
      setCurrentPage(result.page)
      setTotalPages(result.total_pages)
      setTotal(result.total)
    } catch (err) {
      setError('検索に失敗しました')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleViewItem = (selectedItem: FoodItem) => {
    setItem(selectedItem)
    setShowBrowse(false)
    setScanning(false)
  }

  useEffect(() => {
    if (showBrowse) {
      handleSearch(1)
    }
  }, [showBrowse])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">個別確認モード</h2>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div 
        id={READER_ID} 
        style={{ width: '100%', minHeight: scanning ? '320px' : '0' }}
        className={scanning ? 'w-full' : 'w-full invisible h-0'}
      ></div>

      {!scanning && !item && !showBrowse && (
        <div className="space-y-4">
          <div className="text-center">
            <Button onClick={startScanning} size="lg" className="flex items-center gap-2 mx-auto">
              <Scan size={24} />
              バーコードをスキャン
            </Button>
          </div>
          <div className="text-center">
            <Button onClick={() => setShowBrowse(true)} variant="outline" className="flex items-center gap-2 mx-auto">
              <Search size={20} />
              登録データを検索/一覧
            </Button>
          </div>
        </div>
      )}

      {scanning && (
        <div className="text-center">
          <Button onClick={stopScanning} variant="outline">スキャン停止</Button>
        </div>
      )}

      {showBrowse && !item && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="商品名またはバーコードで検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(1)}
            />
            <Button onClick={() => handleSearch(1)} disabled={searchLoading}>
              <Search size={20} />
            </Button>
          </div>

          {searchLoading && (
            <div className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
            </div>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {total}件中 {(currentPage - 1) * 20 + 1}〜{Math.min(currentPage * 20, total)}件を表示
              </p>
              {searchResults.map((resultItem) => (
                <div key={resultItem.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{resultItem.name}</h4>
                      <p className="text-sm text-gray-600 font-mono">{resultItem.barcode}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (expandedItemId === resultItem.id) {
                          setExpandedItemId(null)
                        } else {
                          setExpandedItemId(resultItem.id)
                        }
                      }}
                    >
                      {expandedItemId === resultItem.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </Button>
                  </div>
                  
                  {expandedItemId === resultItem.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="text-sm">
                        <p className="text-gray-600 mb-1">栄養成分</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div>カロリー: {resultItem.nutrition.calories || '-'} kcal</div>
                          <div>タンパク質: {resultItem.nutrition.protein || '-'} g</div>
                          <div>脂質: {resultItem.nutrition.fat || '-'} g</div>
                          <div>炭水化物: {resultItem.nutrition.carbohydrates || '-'} g</div>
                        </div>
                      </div>
                      
                      {resultItem.ingredients.length > 0 && (
                        <div className="text-sm">
                          <p className="text-gray-600 mb-1">原材料</p>
                          <p className="text-xs">{resultItem.ingredients.join(', ')}</p>
                        </div>
                      )}
                      
                      {resultItem.allergens.length > 0 && (
                        <div className="text-sm">
                          <p className="text-orange-700 font-semibold mb-1">アレルゲン</p>
                          <p className="text-xs text-orange-900">{resultItem.allergens.join(', ')}</p>
                        </div>
                      )}
                      
                      <Button size="sm" onClick={() => handleViewItem(resultItem)} className="w-full mt-2">
                        詳細を表示
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    onClick={() => handleSearch(currentPage - 1)}
                    disabled={currentPage === 1 || searchLoading}
                    variant="outline"
                    size="sm"
                  >
                    前へ
                  </Button>
                  <span className="py-2 px-3 text-sm">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    onClick={() => handleSearch(currentPage + 1)}
                    disabled={currentPage === totalPages || searchLoading}
                    variant="outline"
                    size="sm"
                  >
                    次へ
                  </Button>
                </div>
              )}
            </div>
          )}

          {!searchLoading && searchResults.length === 0 && (
            <p className="text-center text-gray-600 py-4">
              {searchQuery ? '検索結果がありません' : '登録されている商品がありません'}
            </p>
          )}

          <div className="text-center">
            <Button onClick={() => { setShowBrowse(false); setSearchQuery(''); setSearchResults([]); }} variant="outline">
              戻る
            </Button>
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
