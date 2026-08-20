import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant/50 w-full mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 lg:px-[80px] py-12 max-w-[1280px] mx-auto gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-display text-headline-sm text-secondary-fixed">Groomit</span>
          <p className="font-body text-body-md text-on-surface text-center md:text-left">
            Premium salon booking for the modern individual.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <Link to="/salons" className="font-body text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Browse Salons
          </Link>
          <a href="#" className="font-body text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Terms of Service
          </a>
          <a href="#" className="font-body text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="font-body text-label-sm text-on-surface-variant hover:text-primary transition-colors">
            Contact Us
          </a>
        </div>
      </div>
    </footer>
  )
}
