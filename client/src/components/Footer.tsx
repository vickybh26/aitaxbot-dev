export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200 py-12 mt-16">
      <div className="max-container container-padding">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src="/attached_assets/aitaxbot-logo-lovable.png" 
                alt="AiTaxBot Logo" 
                className="h-12 w-auto"
                loading="lazy"
              />
            </div>
            <p className="text-base text-readable-light font-medium">
              Your partner in financial growth. Making money simple with smart AI tools and real-time market data.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-neutral-800 mb-4">Calculators</h4>
            <ul className="space-y-2">
              <li><a href="/calculators/income-tax" className="text-sm text-readable hover:text-primary font-medium transition-colors">Income Tax Calculator</a></li>
              <li><a href="/calculators/hra" className="text-sm text-readable hover:text-primary font-medium transition-colors">HRA Calculator</a></li>
              <li><a href="/calculators/sip" className="text-sm text-readable hover:text-primary font-medium transition-colors">SIP Calculator</a></li>
              <li><a href="/calculators/swp" className="text-sm text-readable hover:text-primary font-medium transition-colors">SWP Calculator</a></li>
              <li><a href="/calculators/pf" className="text-sm text-readable hover:text-primary font-medium transition-colors">PF Calculator</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-neutral-800 mb-4">Market Tools</h4>
            <ul className="space-y-2">
              <li><a href="#mutual-funds" className="text-sm text-readable hover:text-primary font-medium transition-colors">Mutual Funds</a></li>
              <li><a href="#stock-quotes" className="text-sm text-readable hover:text-primary font-medium transition-colors">Stock Quotes</a></li>
              <li><a href="#market-news" className="text-sm text-readable hover:text-primary font-medium transition-colors">Market News</a></li>
              <li><a href="#ipo-analyzer" className="text-sm text-readable hover:text-primary font-medium transition-colors">IPO Analyzer</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-neutral-800 mb-4">Legal & Support</h4>
            <ul className="space-y-2">
              <li><a href="/privacy-policy" className="text-sm text-readable hover:text-primary font-medium transition-colors">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="text-sm text-readable hover:text-primary font-medium transition-colors">Terms of Service</a></li>
              <li><a href="mailto:info@aitaxbot.in" className="text-sm text-readable hover:text-primary font-medium transition-colors">Contact Support</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-neutral-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-readable font-semibold">
                © 2025 AiTaxBot. All rights reserved. Built with real financial APIs.
              </p>
              <p className="text-xs text-readable-light mt-1">
                Website: <a href="https://aitaxbot.in" className="hover:text-primary transition-colors">aitaxbot.in</a> | 
                Email: <a href="mailto:info@aitaxbot.in" className="hover:text-primary transition-colors ml-1">info@aitaxbot.in</a>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="https://linkedin.com/company/aitaxbot" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-readable-light hover:text-primary transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/aitaxbot/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-readable-light hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
