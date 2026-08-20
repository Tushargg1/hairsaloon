import { Link } from 'react-router-dom'

const COLUMNS = [
  {
    heading: 'Customers',
    links: [
      { to: '/salons', label: 'Find a Salon' },
      { to: '/signup', label: 'Create Account' },
      { to: '/login', label: 'Sign In' },
    ],
  },
  {
    heading: 'Salon Owners',
    links: [
      { to: '/for-business', label: 'List Your Salon' },
      { to: '/pricing', label: 'Pricing' },
      { to: '/manage/login', label: 'Management Login' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About Us' },
      { to: '/contact', label: 'Contact' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { to: '/terms', label: 'Terms of Service' },
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/refund-policy', label: 'Refund Policy' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="bg-surface-container-highest border-t border-outline-variant/50 w-full mt-auto">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-[80px] py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center border border-outline-variant/50">
                <span className="font-display font-bold text-secondary text-sm">G</span>
              </div>
              <span className="font-display text-title-lg text-secondary-fixed">Groomit</span>
            </div>
            <p className="font-body text-label-sm text-on-surface-variant">
              Premium salon booking for the modern individual.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="font-body text-label-md text-on-surface mb-3 tracking-wider uppercase">
                {col.heading}
              </h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="font-body text-label-sm text-on-surface-variant hover:text-secondary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-t border-outline-variant/30 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-body text-label-sm text-on-surface-variant">
            © {new Date().getFullYear()} Groomit. All rights reserved.
          </p>
          <p className="font-body text-label-sm text-on-surface-variant">
            groomit.in
          </p>
        </div>
      </div>
    </footer>
  )
}
