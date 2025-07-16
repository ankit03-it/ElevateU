import React from 'react'
import '../styles/neon.css' // make sure you import your extra CSS here
import { Link } from 'react-router-dom'


function Home() {
  const features = [
    { title: "DSA Tracker", desc: "Solve 375+ curated questions with XP and level-ups." },
    { title: "Aptitude Arena", desc: "Timed tests with analytics and ranks." },
    { title: "CS Mastery Map", desc: "OOPs, OS, DBMS, CN — level up through the roadmap." },
    { title: "HR Gauntlet", desc: "Mock interviews, resume forge, and charisma drills." },
    { title: "Progress HUD", desc: "Daily, weekly, monthly XP — track your evolution." },
    { title: "Gamified Core", desc: "Unlock badges, powerups, and rise through leaderboards." },
  ]

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-gray-950 relative z-10">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-extrabold tracking-wide gamer-font text-green-400 subtle-glow">
            Elevate
          </span>
          <img
            src="Trending_Up.png"
            alt="rise"
            className="h-8 w-auto neon-icon animate-pulse"
          />
          <span className="text-2xl font-extrabold tracking-wide gamer-font text-green-400 subtle-glow">
            U
          </span>
        </div>

        <div className="space-x-4">
          <Link to="/login">
            <button className="hover:text-green-400 transition font-semibold">Login</button>
          </Link>
          <Link to="/signup">
            <button className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-full font-semibold">
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Glowing top line */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-glow-horizontal"></div>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center py-24 px-4 bg-black relative z-0">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-wide hero-logo text-green-400 flex items-center justify-center gap-2 mb-4">
          {
            "Elevate".split("").map((char, idx) => (
              <span
                key={idx}
                className="neon-slice transition-transform duration-300 hover:scale-150 inline-block"
              >
                {char}
              </span>
            ))
          }
          <img
            src="Trending_Up.png"
            alt="rise"
            className="h-[3.75rem] w-auto animate-pulse neon-icon"
          />
          <span className="neon-slice transition-transform duration-300 hover:scale-150 inline-block">
            U
          </span>
        </h1>

        <h2 className="text-5xl sm:text-6xl font-extrabold text-green-400 tracking-wider hero-title">
          From Zero to Offer Letter
        </h2>

        <p className="text-lg sm:text-xl font-semibold max-w-2xl mb-8 px-4 text-neon-gradient">
          Conquer <span className="text-white">DSA</span>, <span className="text-white">Aptitude</span>, <span className="text-white">CS Fundamentals</span>, and <span className="text-white">HR</span> — <br />
          all in one <span className="text-white">gamified</span> platform designed to level you up.
        </p>

        <button className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-full text-lg transition shadow-lg hover:shadow-green-500/50 glow-on-hover">
          Start Your Journey 🚀
        </button>
      </section>


      {/* Features */}
      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 px-8 py-16 bg-black">
        {features.map((f, idx) => (
          <div key={idx} className="bg-gray-900 p-6 rounded-xl shadow-md border border-green-400 hover:scale-[1.03] transition duration-300 neon-card">
            <h3 className="text-2xl font-bold text-green-400 mb-2">{f.title}</h3>
            <p className="text-gray-300">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Glowing footer line */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-glow-horizontal-reverse"></div>

      {/* Footer */}
      <footer className="text-center text-green-500 text-sm py-6 bg-gray-950">
        © {new Date().getFullYear()} ElevateU — Forge your future.
      </footer>
    </div>
  )
}

export default Home
