import React, { useState } from "react";
import Sidebar from "../../Sidebar";

const Dashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar open by default

  return (
    <div className="min-h-screen bg-black text-white flex transition-all duration-300">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div
        className={`flex-1 px-8 py-10 transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-10"
        }`}
      >
        <h1 className="text-3xl font-bold mb-4">Welcome to ElevateU Dashboard</h1>
        <p className="text-lg text-gray-300">
          Begin your journey to conquer placements!
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
