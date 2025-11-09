import { useState } from 'react'
import DataRegistrationMode from './components/DataRegistrationMode'
import InformationConfirmationMode from './components/InformationConfirmationMode'
import ContinuousConfirmationMode from './components/ContinuousConfirmationMode'
import { Button } from './components/ui/button'
import { Camera, Search, ListChecks } from 'lucide-react'

type Mode = 'continuous' | 'single' | 'register'

function App() {
  const [mode, setMode] = useState<Mode>('continuous')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-center text-indigo-900 mb-4">
            食材買い出し管理
          </h1>
          
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              onClick={() => setMode('continuous')}
              variant={mode === 'continuous' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <ListChecks size={20} />
              連続確認モード
            </Button>
            <Button
              onClick={() => setMode('single')}
              variant={mode === 'single' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Search size={20} />
              個別確認モード
            </Button>
            <Button
              onClick={() => setMode('register')}
              variant={mode === 'register' ? 'default' : 'outline'}
              className="flex items-center gap-2"
            >
              <Camera size={20} />
              データ登録モード
            </Button>
          </div>
        </header>

        <main className="bg-white rounded-lg shadow-lg p-6">
          {mode === 'continuous' && <ContinuousConfirmationMode />}
          {mode === 'single' && <InformationConfirmationMode />}
          {mode === 'register' && <DataRegistrationMode />}
        </main>
      </div>
    </div>
  )
}

export default App
