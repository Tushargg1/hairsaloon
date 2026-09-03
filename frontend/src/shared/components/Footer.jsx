import { Link } from 'react-router-dom'
import Icon from './Icon.jsx'
import SocialButton from './SocialButton.jsx'

// Groomit's own social presence, rendered with the same branded buttons as salons.
const SOCIALS = [
  { key: 'instagram', label: 'Instagram', url: 'https://instagram.com/groomit', brand: 'instagram' },
  { key: 'facebook', label: 'Facebook', url: 'https://facebook.com/groomit', brand: 'facebook' },
  { key: 'youtube', label: 'YouTube', url: 'https://youtube.com/@groomit', brand: 'youtube' },
]

export default function Footer() {
  return (
    <footer className="salon-footer">
      <div className="salon-footer-grid">
        <div>
          <p className="salon-footer-name">Groomit</p>
          <p className="salon-footer-line">Premium salon booking for the modern individual.</p>
          <Link to="/salons" className="salon-footer-cta">Find a Salon</Link>
          <h2 className="salon-footer-title mt-6">Customers</h2>
          <p className="salon-footer-line">
            <Icon name="search" className="text-[15px]" />
            <Link to="/salons">Find a Salon</Link>
          </p>
          <p className="salon-footer-line">
            <Icon name="person_add" className="text-[15px]" />
            <Link to="/signup">Create Account</Link>
          </p>
          <p className="salon-footer-line">
            <Icon name="login" className="text-[15px]" />
            <Link to="/login">Sign In</Link>
          </p>
        </div>

        <div>
          <h2 className="salon-footer-title">Company</h2>
          <p className="salon-footer-line"><Link to="/about">About Us</Link></p>
          <p className="salon-footer-line"><Link to="/contact">Contact</Link></p>
          <p className="salon-footer-line"><Link to="/pricing">Pricing</Link></p>
          <p className="salon-footer-line"><Link to="/terms">Terms of Service</Link></p>
          <p className="salon-footer-line"><Link to="/privacy">Privacy Policy</Link></p>

          <div className="salon-footer-social">
            {SOCIALS.map(({ key, label, url, brand }) => (
              <SocialButton key={key} brand={brand} label={label} url={url} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="salon-footer-title">Salons</h2>
          <p className="salon-footer-line">
            <Icon name="storefront" className="text-[15px]" />
            <Link to="/for-business">List Your Salon</Link>
          </p>
          <p className="salon-footer-line">
            <Icon name="sell" className="text-[15px]" />
            <Link to="/pricing">Pricing</Link>
          </p>
          <p className="salon-footer-line">
            <Icon name="login" className="text-[15px]" />
            <Link to="/manage/login">Management Login</Link>
          </p>
        </div>
      </div>
      <p className="salon-footer-site">
        <Icon name="language" className="text-[14px]" />
        groomit.in
      </p>
      <p className="salon-footer-mark">Groomit</p>
    </footer>
  )
}
