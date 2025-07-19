import React, { useState } from "react";
import Sidebar from "../../Sidebar";

const TechTrials = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-black text-white flex transition-all duration-300">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div
        className={`flex-1 px-8 py-10 transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-10"
        }`}
      >
        <h1 className="text-3xl font-bold mb-4">TechTrials & Aptitude</h1>
        <p className="text-lg text-gray-300">Sharpen your aptitude and problem-solving instincts!</p>
      </div>
    </div>
  );
};

export default TechTrials;
