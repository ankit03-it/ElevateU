import React, { useState } from 'react';

function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // 🔒 Handle login logic here
        console.log('Logging in with', formData);
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col">

            {/* 🔰 Navbar */}
            <nav className="flex justify-between items-center px-6 py-4 bg-gray-950 relative z-10">
                <div className='flex items-center'>
                    {
                        "Elevate".split("").map((char, idx) => (
                            <span
                                key={idx}
                                className="text-2xl font-extrabold text-green-400 tracking-wide gamer-font subtle-glow hover:scale-150 transition-transform duration-300"
                            >
                                {char}
                            </span>
                        ))
                    }
                    <img
                        src="Trending_Up.png"
                        alt="logo"
                        className="h-8 w-auto mx-1 animate-pulse neon-icon"
                    />
                    <span className="text-2xl font-extrabold text-green-400 tracking-wide gamer-font subtle-glow hover:scale-150 transition-transform duration-300">
                        U
                    </span>
                </div>
                <a
                    href="/"
                    className="text-green-300 hover:text-green-400 font-semibold transition drop-shadow-md"
                >
                    Back to Home
                </a>

            </nav>

            {/* 🌈 Glowing navbar separator */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-glow-horizontal"></div>

            {/* 🧪 Login Form */}
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl shadow-lg border border-green-400 neon-card">
                    <h2 className="text-3xl font-extrabold text-green-400 text-center mb-6 gamer-font subtle-glow">
                        Welcome Back
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-green-300 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-black text-white border border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 neon-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-green-300 mb-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-black text-white border border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 neon-input"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded-lg transition glow-on-hover"
                        >
                            Login 🔓
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Login;
