import React from "react";
import { Link } from "react-router-dom";

const About = () => {
    return (
        <div className="min-h-screen bg-black text-white px-4 py-12 flex flex-col items-center justify-center space-y-12">

            {/* Logo */}
            <h1 className="text-5xl sm:text-6xl font-extrabold tracking-wide text-green-400 flex items-center justify-center gap-2 mb-4">
                {"Elevate".split("").map((char, idx) => (
                    <span
                        key={idx}
                        className="neon-slice transition-transform duration-300 hover:scale-150 inline-block"
                    >
                        {char}
                    </span>
                ))}
                <img
                    src="/Trending_Up.png"
                    alt="rise"
                    className="h-[3.75rem] w-auto animate-pulse neon-icon"
                />
                <span className="neon-slice transition-transform duration-300 hover:scale-150 inline-block">
                    U
                </span>
            </h1>

            {/* Glowing Divider */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-glow-horizontal"></div>

            {/* Motivational Quote Section */}
            <div className="text-center max-w-3xl space-y-4">
                <p className="text-lg sm:text-xl italic text-gray-300">
                    Said you're not IIT, so dreams don’t belong.<br />
                    While others scroll through reels, you're coding strong.<br />
                    Here’s where the zero writes his aftermath —<br />
                    ElevateU — your code, your path.
                </p>
            </div>

            {/* Features Section */}
            <div className="max-w-4xl space-y-4 text-left text-lg">
                <h2 className="text-2xl text-green-400 font-bold underline underline-offset-4">Why ElevateU?</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                    <li>🎮 Gamified DSA and Aptitude training to make your grind fun and addictive.</li>
                    <li>📚 Integrated CS Fundamentals, HR, Aptitude — all in one platform.</li>
                    <li>🎯 Track your EXP, HP, MP as you conquer coding challenges.</li>
                    <li>🏆 Mission-based learning with side quests and boss fights.</li>
                    <li>📊 Performance charts to measure your real growth.</li>
                    <li>💼 Built by a student, for students — no fluff, just real prep.</li>
                </ul>
            </div>

            {/* Mini Line Break */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse"></div>

            {/* Slogan + CTA */}
            <div className="text-center space-y-4">
                <h3 className="text-xl sm:text-2xl font-semibold text-green-400 italic">
                    ElevateU — we guide you Conquer.
                </h3>
                <h3 className="text-2xl sm:text-3xl font-semibold text-yellow-400">
                    Are you ready to level up?
                </h3>

                <div className="flex gap-6 justify-center mt-4">
                    <Link to="/login">
                        <button className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-semibold shadow-md glow-on-hover">
                            Login
                        </button>
                    </Link>
                    <Link to="/signup">
                        <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-semibold shadow-md glow-on-hover">
                            Sign Up
                        </button>
                    </Link>
                </div>
            </div>

            {/* Footer Glow Line */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-glow-horizontal-reverse"></div>

            {/* Inline CSS for Animations + Scrollbar Hide */}
            <style>{`
                @keyframes glow-horizontal {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }

                .animate-glow-horizontal {
                    background-size: 200% 100%;
                    animation: glow-horizontal 4s linear infinite;
                }

                .animate-glow-horizontal-reverse {
                    background-size: 200% 100%;
                    animation: glow-horizontal 4s linear infinite reverse;
                }

                .neon-slice {
                    color: #39ff14;
                    text-shadow:
                        0 0 5px #39ff14,
                        0 0 10px #39ff14,
                        0 0 20px #39ff14,
                        0 0 40px #39ff14;
                }

                .neon-icon {
                    filter: drop-shadow(0 0 3px #39ff14) drop-shadow(0 0 5px #39ff14);
                }

                .glow-on-hover:hover {
                    box-shadow: 0 0 10px #fff,
                                0 0 20px #39ff14,
                                0 0 30px #39ff14,
                                0 0 40px #39ff14;
                    transition: all 0.3s ease-in-out;
                }

                /* Hide scrollbar across all browsers */
                body::-webkit-scrollbar {
                    display: none;
                }
                body {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default About;
