import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-blue-400">ElevateU Frontend</h1>
        <p className="text-lg text-gray-300">TailwindCSS is working perfectly 🚀</p>
        <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg shadow-lg transition duration-300">
          Click Me
        </button>
      </div>
    </div>
  )
}

export default App
