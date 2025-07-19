import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const handleLogout = () => navigate("/");

  const routes = [
    ["Dashboard", "Adventurer Profile"],
    ["ProgressChronicle", "Progress Chronicle"],
    ["LanguageLab", "Language Lab"],
    ["DSAMastery", "DSA Mastery"],
    ["CSCrucible", "CS Crucible"],
    ["AptitudeArena", "Aptitude Arena"],
    ["HRGauntlet", "HR Gauntlet"],
    ["TechTrials", "Tech Trials"],
    ["ResumeBuilder", "Resume Builder"],
  ];

  return (
    <div className="relative z-50">
      {/* Hamburger / Close Button */}
      <button
        onClick={toggleSidebar}
        className={`text-neonGreen p-2 fixed top-4 left-4 z-50 bg-black border border-neonGreen rounded-md shadow-md 
          hover:bg-neonGreen hover:text-black transition duration-300 cursor-pointer
          ${isOpen ? "rotate-90" : ""}
        `}
      >
        {isOpen ? "✖" : "☰"}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-60 bg-black text-neonGreen p-6 pt-20 transition-transform duration-500 ease-in-out z-40 
          shadow-[0_0_20px_#39ff14] border-r border-neonGreen
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <h2 className="text-3xl font-bold mb-8 font-mono neon-glow">ElevateU</h2>

        <nav className="flex flex-col space-y-5 text-lg font-semibold">
          {routes.map(([to, label]) => {
            const isActive = location.pathname === `/${to}`;
            return (
              <Link
                key={to}
                to={`/${to}`}
                onClick={() => setIsOpen(false)}
                className={`transition duration-200 neon-link ${
                  isActive ? "active-link" : "hover:text-white"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 text-black bg-neonGreen rounded-md font-bold hover:bg-white transition duration-300 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Custom Styles */}
      <style>
        {`
          .text-neonGreen {
            color: #39ff14;
          }
          .bg-neonGreen {
            background-color: #39ff14;
          }
          .border-neonGreen {
            border-color: #39ff14;
          }
          .neon-glow {
            text-shadow: 0 0 5px #39ff14, 0 0 10px #39ff14, 0 0 20px #39ff14;
          }
          .neon-link:hover {
            color: #fff;
            text-shadow: 0 0 5px #39ff14, 0 0 10px #39ff14;
          }

          .active-link {
            color: #ffffff;
            animation: glow-pulse 2s infinite ease-in-out;
            text-shadow: 0 0 10px #39ff14, 0 0 20px #39ff14, 0 0 30px #39ff14;
          }

          @keyframes glow-pulse {
            0% {
              text-shadow: 0 0 10px #39ff14, 0 0 20px #39ff14;
            }
            50% {
              text-shadow: 0 0 20px #39ff14, 0 0 40px #39ff14;
            }
            100% {
              text-shadow: 0 0 10px #39ff14, 0 0 20px #39ff14;
            }
          }
        `}
      </style>
    </div>
  );
};

export default Sidebar;
