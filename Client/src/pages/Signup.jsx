import React, { useState } from 'react'
import '../styles/neon.css' // import styles if not already in App
import { Link } from 'react-router-dom'

function Signup() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    })

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match")
            return
        }

        try {
            const res = await fetch("http://localhost:5000/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: formData.name,
                    email: formData.email,
                    password: formData.password,
                }),
            })

            const data = await res.json()

            if (res.ok) {
                alert(data.message) // or redirect to login
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                })
            } else {
                alert(data.error || "Signup failed")
            }
        } catch (error) {
            console.error("Signup Error:", error)
            alert("Something went wrong")
        }
    }


    return (
        <>
            {/* Navbar for Signup */}
            <nav className="flex justify-between items-center px-6 py-4 bg-gray-950 relative z-10">
                <Link to="/" className="flex items-center gap-1">
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
                </Link>

                <a
                    href="/"
                    className="text-green-300 hover:text-green-400 font-semibold transition drop-shadow-md"
                >
                    Back to Home
                </a>

            </nav>

            {/* Glowing Line Under Navbar */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-glow-horizontal"></div>
            {/* Signup Form */}
            <div className="min-h-screen bg-black text-white flex items-center justify-center px-4 pt-8">
                <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl shadow-lg border border-green-400 neon-card">
                    <h2 className="text-3xl font-extrabold text-green-400 text-center mb-6 gamer-font subtle-glow">
                        Create Account
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-green-300 mb-1">Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-black text-white border border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 neon-input"
                            />
                        </div>
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
                        <div>
                            <label className="block text-sm text-green-300 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-black text-white border border-green-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 neon-input"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-2 rounded-lg transition glow-on-hover"
                        >
                            Sign Up 🚀
                        </button>
                    </form>
                </div>
            </div>
        </>
    )

}

export default Signup
