import React from 'react';
import '../styles/neon.css';
import { Link, useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  const features = [
    { title: "DSA Mastery", desc: "Sharpen your mind, solve each test with grace,<br />400+ real questions from the placement race." },
    { title: "Aptitude Arena", desc: "Timed duels await — from quant to rare,<br />Logic, language, and riddles laid bare." },
    { title: "CS Crucible", desc: "From OS to OOPs, the core shall burn,<br />Face DBMS and CN, and watch your skills turn." },
    { title: "HR Gauntlet", desc: "Mock the mirror, speak with flair,<br />Own every round with confident care." },
    { title: "Language Lab", desc: "C++, Python, or Java you wield,<br />Train with code in a recursive field." },
    { title: "Resume Builder", desc: "Craft your story like tides on the shore,<br />Build a resume the world can’t ignore." },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-6 py-4 bg-gray-950 relative z-10">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-extrabold tracking-wide gamer-font text-green-400 subtle-neon">
            Elevate
          </span>
          <img
            src="Trending_Up.png"
            alt="rise"
            className="h-8 w-auto animate-pulse subtle-neon-icon"
          />
          <span className="text-2xl font-extrabold tracking-wide gamer-font text-green-400 subtle-neon">
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

      {/* Top Glow Line */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-glow-horizontal"></div>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center py-24 px-4 bg-black relative z-0">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-wide text-green-400 flex items-center justify-center gap-2 mb-4">
          {
            "Elevate".split("").map((char, idx) => (
              <span
                key={idx}
                className="subtle-neon transition-transform duration-300 hover:scale-125 inline-block"
              >
                {char}
              </span>
            ))
          }
          <img
            src="Trending_Up.png"
            alt="rise"
            className="h-[3.75rem] w-auto animate-pulse subtle-neon-icon"
          />
          <span className="subtle-neon transition-transform duration-300 hover:scale-125 inline-block">
            U
          </span>
        </h1>

        <h2 className="text-5xl sm:text-6xl font-extrabold text-green-400 tracking-wider subtle-neon">
          From Zero to Offer Letter
        </h2>

        <p className="text-lg sm:text-xl font-semibold max-w-2xl mb-8 px-4 text-neon-gradient">
          <br />
          Conquer <span className="text-white">DSA</span>, <span className="text-white">Aptitude</span>, <span className="text-white">CS Fundamentals</span>, and <span className="text-white">HR</span> — <br />
          all in one <span className="text-white">gamified</span> platform designed to level you up.
        </p>

        <button
          onClick={() => navigate("/about")}
          className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-full text-lg transition shadow-lg hover:shadow-green-500/50 glow-on-hover"
        >
          Start Your Journey 🚀
        </button>
      </section>

      {/* Features */}
      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 px-8 py-16 bg-black">
        {features.map((f, idx) => (
          <Link
            to="/login"
            key={idx}
            className="bg-gray-900 p-6 rounded-xl shadow-md border border-green-400 hover:scale-[1.03] transition duration-300 neon-card block"
          >
            <h3 className="text-2xl font-bold text-green-400 mb-2">{f.title}</h3>
            <p
              className="text-gray-300"
              dangerouslySetInnerHTML={{ __html: f.desc }}
            />
          </Link>
        ))}
      </section>

      {/* Footer Glow */}
      <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-glow-horizontal-reverse"></div>

      {/* Footer */}
      <footer className="text-center text-green-500 text-sm py-6 bg-gray-950">
        © {new Date().getFullYear()} ElevateU — Forge your future.
      </footer>

      {/* Subtle Neon CSS */}
      <style>{`
        .subtle-neon {
          text-shadow:
            0 0 2px #39ff14,
            0 0 4px #39ff14;
        }

        .subtle-neon-icon {
          filter: drop-shadow(0 0 2px #39ff14);
        }
      `}</style>
    </div>
  );
}

export default Home;
