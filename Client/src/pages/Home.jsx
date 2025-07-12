// client/src/pages/Home.jsx
import React from 'react'

function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-gray-900 shadow-md">
        <h1 className="text-2xl font-bold text-blue-400">ElevateU</h1>
        <div className="space-x-4">
          <button className="hover:text-blue-400 transition">Login</button>
          <button className="bg-blue-500 hover:bg-blue-600 px-4 py-1 rounded-md transition">Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center py-24 px-4">
        <h2 className="text-4xl sm:text-5xl font-bold text-blue-300 leading-tight mb-4">
          From Zero to Offer Letter
        </h2>
        <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mb-6">
          One platform to master DSA, Aptitude, CS Fundamentals, HR Prep, and more —
          gamified and structured for real results.
        </p>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg text-lg transition">
          Start Your Journey 🚀
        </button>
      </section>

      {/* Features */}
      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 px-8 py-12">
        {[
          { title: "DSA Tracker", desc: "Solve 375+ curated questions with XP and level-ups." },
          { title: "Aptitude Tests", desc: "Timed tests with analytics and ranks." },
          { title: "CS Roadmaps", desc: "OOPs, OS, DBMS, CN — visual progress and notes." },
          { title: "HR & Resume", desc: "Mock interviews, resume tips, and soft skill boosters." },
          { title: "Progress Tracker", desc: "Track your daily, weekly, and monthly grind." },
          { title: "Gamified Learning", desc: "Earn EXP, unlock badges, and chase leaderboards." },
        ].map((f, idx) => (
          <div key={idx} className="bg-gray-900 p-6 rounded-xl shadow-md hover:shadow-blue-500/20 border border-gray-800 transition">
            <h3 className="text-xl font-semibold text-blue-400 mb-2">{f.title}</h3>
            <p className="text-gray-300">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-4 border-t border-gray-800">
        © {new Date().getFullYear()} ElevateU — Built for students, by students.
      </footer>
    </div>
  )
}

export default Home


