import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import PageHeader from "@/components/PageHeader";
import { trackPageView } from "@/lib/analytics";
import { Mail, Phone, MapPin, Linkedin, Instagram } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    trackPageView('/contact', 'Contact Us - AiTaxBot');
  }, []);

  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('POST', '/api/contact', data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us! We'll get back to you within 24 hours.",
      });
      setFormData({ name: '', email: '', subject: '', message: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactMutation.mutate(formData);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us - AiTaxBot Support & Inquiries</title>
        <meta name="description" content="Get in touch with AiTaxBot for tax calculator support, questions, or feedback. Email: info@aitaxbot.in | Phone: +91 78998 69036 | Bengaluru, India" />
        <meta name="keywords" content="contact aitaxbot, tax calculator support, customer support India, tax help" />
        <link rel="canonical" href="https://aitaxbot.co.in/contact" />
        
        <meta property="og:title" content="Contact AiTaxBot - Tax Calculator Support" />
        <meta property="og:description" content="Reach out to our team for assistance with tax calculations and financial planning tools." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://aitaxbot.co.in/contact" />
        <meta property="og:image" content="https://aitaxbot.co.in/images/aitaxbot-logo.png" />
      </Helmet>
      
      <PageHeader
        title="Contact Us"
        subtitle="Have questions, feedback, or need help with a tool? We're here for you."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Contact" }
        ]}
      />

      <div>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Get in Touch</h2>
              <p className="text-gray-600 mb-8">
                Have questions about tax calculations, need help with our tools, or want to share feedback? 
                We'd love to hear from you. Our team is here to help you navigate your tax journey.
              </p>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-3 mt-1">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
                    <a 
                      href="mailto:info@aitaxbot.in" 
                      className="text-persian-blue-600 hover:text-persian-blue-700 transition-colors"
                      data-testid="link-email"
                    >
                      info@aitaxbot.in
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 rounded-full p-3 mt-1">
                    <Phone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
                    <a 
                      href="tel:+917899869036" 
                      className="text-persian-blue-600 hover:text-persian-blue-700 transition-colors"
                      data-testid="link-phone"
                    >
                      +91 78998 69036
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 rounded-full p-3 mt-1">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Location</h3>
                    <p className="text-gray-700">Bengaluru, Karnataka, India</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow Us</h3>
                <div className="flex space-x-4">
                  <a 
                    href="https://www.linkedin.com/company/aitaxbot/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-100 hover:bg-blue-200 rounded-full p-3 transition-colors"
                    data-testid="link-linkedin"
                  >
                    <Linkedin className="w-5 h-5 text-blue-600" />
                  </a>
                  <a 
                    href="https://www.instagram.com/aitaxbot/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-pink-100 hover:bg-pink-200 rounded-full p-3 transition-colors"
                    data-testid="link-instagram"
                  >
                    <Instagram className="w-5 h-5 text-pink-600" />
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-gray-50 rounded-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    disabled={contactMutation.isPending}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-persian-blue-500 focus:border-persian-blue-500 transition-colors disabled:opacity-50"
                    placeholder="Your full name"
                    data-testid="input-name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    disabled={contactMutation.isPending}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-persian-blue-500 focus:border-persian-blue-500 transition-colors disabled:opacity-50"
                    placeholder="your.email@example.com"
                    data-testid="input-email"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    disabled={contactMutation.isPending}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-persian-blue-500 focus:border-persian-blue-500 transition-colors disabled:opacity-50"
                    placeholder="How can we help you?"
                    data-testid="input-subject"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    disabled={contactMutation.isPending}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-persian-blue-500 focus:border-persian-blue-500 transition-colors resize-none disabled:opacity-50"
                    placeholder="Tell us about your question or feedback..."
                    data-testid="input-message"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={contactMutation.isPending}
                  className="w-full bg-persian-blue-600 text-white px-6 py-3 rounded-lg hover:bg-persian-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-submit-contact"
                >
                  {contactMutation.isPending ? 'Sending...' : 'Send Message'}
                </button>
              </form>

              <div className="mt-6 text-sm text-gray-500">
                <p>* Required fields</p>
                <p className="mt-2">We typically respond within 24 hours during business days.</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-12 bg-blue-50 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Is AiTaxBot really free?</h3>
                <p className="text-gray-700">Yes! All our calculators and tools are completely free to use with no hidden charges or subscriptions.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How accurate are the calculations?</h3>
                <p className="text-gray-700">Our calculations are based on the latest Indian tax laws and are designed by a Chartered Accountant for maximum accuracy.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Do you store my financial data?</h3>
                <p className="text-gray-700">No, all calculations are performed locally in your browser. We don't store any of your financial information.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can you help with tax filing?</h3>
                <p className="text-gray-700">We provide calculation tools and guidance. For actual tax filing, please consult with a qualified tax professional.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}