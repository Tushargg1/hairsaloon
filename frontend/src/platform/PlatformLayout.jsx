import { Outlet } from 'react-router-dom'
import Navbar from '../shared/components/Navbar.jsx'
import Footer from '../shared/components/Footer.jsx'

export default function PlatformLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow pt-20">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
