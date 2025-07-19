import { useState } from 'react'
import './App.css'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login';
import Dashboard from './pages/Dashboard_Pages/Dashboard';
import AptitudeArena from './pages/Dashboard_Pages/AptitudeArena';
import CSCrucible from './pages/Dashboard_Pages/CSCrucible';
import DSAMastery from './pages/Dashboard_Pages/DSAMastery';
import HRGauntlet from './pages/Dashboard_Pages/HRGauntlet';
import LanguageLab from './pages/Dashboard_Pages/LanguageLab';
import ProgressChronicle from './pages/Dashboard_Pages/ProgressChronicle';
import ResumeBuilder from './pages/Dashboard_Pages/ResumeBuilder';
import TechTrials from './pages/Dashboard_Pages/TechTrials';


function App() {

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/AptitudeArena" element={<AptitudeArena />} />
      <Route path="/Dashboard" element={<Dashboard />} />
      <Route path="/CSCrucible" element={<CSCrucible />} />
      <Route path="/DSAMastery" element={<DSAMastery />} />
      <Route path="/HRGauntlet" element={<HRGauntlet />} />
      <Route path="/LanguageLab" element={<LanguageLab />} />
      <Route path="/ProgressChronicle" element={<ProgressChronicle />} />
      <Route path="/ResumeBuilder" element={<ResumeBuilder />} />
      <Route path="/TechTrials" element={<TechTrials />} />
    </Routes>
  )
}

export default App


