// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // IMPORTANT: Adjust these paths if your files are in different locations
    "./templates/**/*.html", // Scans all HTML files in the 'templates' directory and its subdirectories
    "./static/js/**/*.js",   // Scans all JS files in 'static/js' and its subdirectories
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'), // This line should already be there due to -p flag
  ],
}