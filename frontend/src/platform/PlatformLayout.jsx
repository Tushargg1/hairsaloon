import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../shared/components/Navbar.jsx'
import Footer from '../shared/components/Footer.jsx'

export default function PlatformLayout() {
  // Shares the salon site's theme key so switching on either side stays consistent.
  const [theme, setTheme] = useState(() => localStorage.getItem('groomit-site-theme') || 'light')
  const light = theme === 'light'
  const toggleTheme = () => {
    const next = light ? 'dark' : 'light'
    localStorage.setItem('groomit-site-theme', next)
    setTheme(next)
  }

  return (
    <div className={`site-root min-h-screen flex flex-col ${light ? 'theme-light' : ''}`}>
      <Navbar />
      <div className="flex-grow pt-12">
        <Outlet context={{ siteLight: light, toggleSiteTheme: toggleTheme }} />
      </div>
      <Footer />
    </div>
  )
}
