import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { trackButtonClick } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/lib/firebase";
import logoImage from "@assets/aitaxbot-logo-lovable.png";
import { Menu, X, Calculator, LogOut, User, LayoutDashboard } from "lucide-react";

interface HeaderProps {
  showModal?: (modalType: string) => void;
}

export default function Header({ showModal }: HeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const [currentPath] = useLocation();
  
  const getLoginUrl = () => {
    if (currentPath && currentPath !== '/' && currentPath !== '/login') {
      return `/login?returnUrl=${encodeURIComponent(currentPath)}`;
    }
    return '/login';
  };
  
  const handleModalOpen = (modalType: string) => {
    if (showModal) {
      showModal(modalType);
      trackButtonClick(`${modalType} from header`, 'Header Navigation');
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="glass-header sticky top-0 z-50 shadow-soft">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link 
              href="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              onClick={() => trackButtonClick('Logo Home', 'Header')}
              data-testid="link-home-logo"
            >
              <img 
                src={logoImage} 
                alt="AiTaxBot Logo" 
                className="h-14 w-auto"
              />
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {isAuthenticated && (
              <Link 
                href="/dashboard"
                onClick={() => trackButtonClick('Dashboard', 'Header Navigation')}
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center"
                data-testid="link-header-dashboard"
              >
                <LayoutDashboard className="w-4 h-4 mr-1" />
                Dashboard
              </Link>
            )}
            <Link 
              href="/calculators"
              onClick={() => trackButtonClick('Calculators', 'Header Navigation')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center"
              data-testid="link-header-calculators"
            >
              <Calculator className="w-4 h-4 mr-1" />
              Calculators
            </Link>
            <Link 
              href="/accounting"
              onClick={() => trackButtonClick('Accounting', 'Header Navigation')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              data-testid="link-header-accounting"
            >
              Accounting
            </Link>
            <Link 
              href="/blog"
              onClick={() => trackButtonClick('Blog', 'Header Navigation')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              data-testid="link-header-blog"
            >
              Blog
            </Link>
            <Link 
              href="/about"
              onClick={() => trackButtonClick('About', 'Header Navigation')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              data-testid="link-header-about"
            >
              About
            </Link>
            <Link 
              href="/contact"
              onClick={() => trackButtonClick('Contact', 'Header Navigation')}
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
              data-testid="link-header-contact"
            >
              Contact
            </Link>
            <Link 
              href="/calculators/income-tax"
              onClick={() => trackButtonClick('Income Tax Calculator', 'Header Navigation')}
              className="gradient-blue text-white px-5 py-2.5 rounded-lg hover:shadow-colored transition-all duration-300 font-medium flex items-center shadow-soft hover:scale-105"
              data-testid="button-header-tax-calculator"
            >
              Tax Calculator
            </Link>
            {isAuthenticated ? (
              <Button 
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </Button>
            ) : (
              <Link 
                href={getLoginUrl()}
                onClick={() => trackButtonClick('Login', 'Header Navigation')}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition-all duration-300 font-medium shadow-soft hover:shadow-medium hover:scale-105"
                data-testid="link-header-login"
              >
                Login
              </Link>
            )}
          </nav>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-card border-t border-slate-200 shadow-strong">
          <div className="px-6 py-4">
            <div className="space-y-3">
              {isAuthenticated && (
                <Link 
                  href="/dashboard"
                  onClick={() => {
                    trackButtonClick('Dashboard', 'Mobile Header');
                    setMobileMenuOpen(false);
                  }}
                  className="block text-slate-600 hover:text-slate-900 font-medium py-2 flex items-center"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />Dashboard
                </Link>
              )}
              <Link 
                href="/calculators"
                onClick={() => {
                  trackButtonClick('Calculators', 'Mobile Header');
                  setMobileMenuOpen(false);
                }}
                className="block text-slate-600 hover:text-slate-900 font-medium py-2 flex items-center"
              >
                <Calculator className="w-4 h-4 mr-2" />Calculators
              </Link>
              <Link 
                href="/accounting"
                onClick={() => {
                  trackButtonClick('Accounting', 'Mobile Header');
                  setMobileMenuOpen(false);
                }}
                className="block text-slate-600 hover:text-slate-900 font-medium py-2"
              >
                Accounting
              </Link>
              <Link 
                href="/blog"
                onClick={() => {
                  trackButtonClick('Blog', 'Mobile Header');
                  setMobileMenuOpen(false);
                }}
                className="block text-slate-600 hover:text-slate-900 font-medium py-2"
              >
                Blog
              </Link>
              <Link 
                href="/about"
                onClick={() => {
                  trackButtonClick('About', 'Mobile Header');
                  setMobileMenuOpen(false);
                }}
                className="block text-slate-600 hover:text-slate-900 font-medium py-2"
              >
                About
              </Link>
              <Link 
                href="/contact"
                onClick={() => {
                  trackButtonClick('Contact', 'Mobile Header');
                  setMobileMenuOpen(false);
                }}
                className="block text-slate-600 hover:text-slate-900 font-medium py-2"
              >
                Contact
              </Link>
              <Link 
                href="/calculators/income-tax"
                onClick={() => {
                  trackButtonClick('Income Tax Calculator', 'Mobile Header');
                  setMobileMenuOpen(false);
                }}
                className="block bg-persian-blue-600 text-white px-4 py-3 rounded-lg hover:bg-persian-blue-700 transition-colors font-medium text-center"
              >
                Tax Calculator
              </Link>
              {isAuthenticated ? (
                <Button 
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-red-600 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              ) : (
                <Link 
                  href={getLoginUrl()}
                  onClick={() => {
                    trackButtonClick('Login', 'Mobile Header');
                    setMobileMenuOpen(false);
                  }}
                  className="block bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium text-center"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
