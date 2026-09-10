import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Overview from './pages/Overview'
import MapExplorer from './pages/MapExplorer'
import Optimizer from './pages/Optimizer'
import DataExplorer from './pages/DataExplorer'
import Methodology from './pages/Methodology'

export default function App() {
  return (
    <div className="flex h-svh w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/map" element={<MapExplorer />} />
            <Route path="/optimizer" element={<Optimizer />} />
            <Route path="/data" element={<DataExplorer />} />
            <Route path="/methodology" element={<Methodology />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
