import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { api, OCRResponse } from '../api'

export default function DataRegistrationMode() {
  const [image, setImage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = async () => {
    try {
      if (!window.isSecureContext) {
        setError('カメラアクセスにはHTTPS接続が必要です')
        return
      }
      
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('お使いのブラウザはカメラアクセスに対応していません')
        return
      }

      if (videoRef.current?.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream
        oldStream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }

      let stream: MediaStream | null = null
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        })
      } catch (facingModeErr) {
        console.log('facingMode failed, trying deviceId approach', facingModeErr)
        
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter(d => d.kind === 'videoinput')
          
          if (videoDevices.length === 0) {
            throw new Error('カメラが見つかりません')
          }
          
          const backCamera = videoDevices.find(d => 
            /back|rear|environment/i.test(d.label)
          ) || videoDevices[videoDevices.length - 1] // fallback to last camera
          
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: backCamera.deviceId } }
          })
        } catch (deviceErr) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true })
        }
      }
      
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        
        try {
          await videoRef.current.play()
          setCameraActive(true)
          setError(null)
        } catch (playErr) {
          console.warn('video play failed', playErr)
          setCameraActive(true)
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
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setCameraActive(false)
    }
  }

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')
        setImage(imageData)
        stopCamera()
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const processImage = async () => {
    if (!image) return
    
    setLoading(true)
    setError(null)
    try {
      const result = await api.processOCR(image)
      setOcrResult(result)
    } catch (err) {
      setError('画像の処理に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const registerItem = async () => {
    if (!ocrResult) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await api.registerItem({
        barcode: ocrResult.barcode || '',
        name: ocrResult.name || '不明',
        nutrition: ocrResult.nutrition,
        ingredients: ocrResult.ingredients,
        allergens: ocrResult.allergens,
        additives: ocrResult.additives,
      })
      setSuccess('商品を登録しました')
      setImage(null)
      setOcrResult(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">データ登録モード</h2>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {!image && !cameraActive && (
        <div className="space-y-4">
          <div className="flex gap-4 justify-center">
            <Button onClick={startCamera} className="flex items-center gap-2">
              <Camera size={20} />
              カメラを起動
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload size={20} />
              画像をアップロード
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {cameraActive && (
        <div className="space-y-4">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full rounded-lg border-2 border-gray-300"
          />
          <div className="flex gap-4 justify-center">
            <Button onClick={captureImage}>撮影</Button>
            <Button onClick={stopCamera} variant="outline">キャンセル</Button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {image && !ocrResult && (
        <div className="space-y-4">
          <img src={image} alt="Captured" className="w-full rounded-lg border-2 border-gray-300" />
          <div className="flex gap-4 justify-center">
            <Button onClick={processImage} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                'AI OCRで解析'
              )}
            </Button>
            <Button onClick={() => setImage(null)} variant="outline">やり直し</Button>
          </div>
        </div>
      )}

      {ocrResult && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div>
              <Label>バーコード</Label>
              <Input value={ocrResult.barcode || '未検出'} readOnly />
            </div>
            <div>
              <Label>商品名</Label>
              <Input value={ocrResult.name || '不明'} readOnly />
            </div>
            <div>
              <Label>栄養成分</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>カロリー: {ocrResult.nutrition.calories || '-'} kcal</div>
                <div>タンパク質: {ocrResult.nutrition.protein || '-'} g</div>
                <div>脂質: {ocrResult.nutrition.fat || '-'} g</div>
                <div>炭水化物: {ocrResult.nutrition.carbohydrates || '-'} g</div>
              </div>
            </div>
            <div>
              <Label>原材料</Label>
              <div className="text-sm">{ocrResult.ingredients.join(', ') || 'なし'}</div>
            </div>
            <div>
              <Label>アレルゲン</Label>
              <div className="text-sm">{ocrResult.allergens.join(', ') || 'なし'}</div>
            </div>
            <div>
              <Label>添加物</Label>
              <div className="text-sm">{ocrResult.additives.join(', ') || 'なし'}</div>
            </div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <Button onClick={registerItem} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登録中...
                </>
              ) : (
                '登録'
              )}
            </Button>
            <Button onClick={() => { setImage(null); setOcrResult(null); }} variant="outline">
              キャンセル
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
