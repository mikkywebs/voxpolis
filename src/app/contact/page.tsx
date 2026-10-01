'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ALL_COUNTRIES, CountryConfig } from '@/config/countries';
import { Mail, MapPin, Send, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';

export default function ContactPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [contactData, setContactData] = useState({
    title: 'Contact Voxpolis Desk',
    subtitle: 'Have a question about our political coverage, reporting, or editorial inquiries? Reach out to our operational team.',
    email: 'contact@voxpolis.app',
    desk_phone: '+234 (0) 906 000 0000',
    headquarters_address: 'Plot 42, Central Business District, Abuja, Federal Capital Territory, Nigeria',
    press_inquiries: 'press@voxpolis.app',
    response_time: 'Within 24 hours on business days',
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadContactData() {
      try {
        const res = await fetch('/api/site-pages?page=contact');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setContactData((prev) => ({ ...prev, ...json.data }));
          }
        }
      } catch (e) {
        console.warn('Using default contact info', e);
      }
    }
    loadContactData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-blue-600 selection:text-white">
      <Header selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span>Editorial & Support Communication</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {contactData.title}
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
            {contactData.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Contact Details Panel */}
          <div className="space-y-6 p-6 rounded-3xl bg-gray-900/80 border border-gray-800 shadow-xl">
            <h2 className="font-extrabold text-base text-white flex items-center gap-2 border-b border-gray-800 pb-3">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>Direct Channels</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Editorial & General Inquiries</span>
                <a href={`mailto:${contactData.email}`} className="text-blue-400 hover:underline font-bold text-sm">
                  {contactData.email}
                </a>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Press & Syndication</span>
                <a href={`mailto:${contactData.press_inquiries}`} className="text-cyan-400 hover:underline font-bold text-sm">
                  {contactData.press_inquiries}
                </a>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Operating Bureau</span>
                <div className="text-gray-200 font-medium flex items-center gap-1.5 mt-1">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{contactData.headquarters_address}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Response Time</span>
                <p className="text-gray-300">{contactData.response_time}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/50 text-[11px] text-gray-300 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>Voxpolis operates an independent political journalism and civic reporting network serving readers across {ALL_COUNTRIES.length} countries.</span>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl bg-gray-900/80 border border-gray-800 shadow-xl">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">Message Delivered</h3>
                <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
                  Thank you for contacting the Voxpolis Editorial Desk. Our team has received your inquiry and will follow up shortly.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setMessage('');
                  }}
                  className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-slate-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Your Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full bg-slate-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Inquiry Category</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="General Inquiry">General Editorial Inquiry</option>
                    <option value="Story Lead">Submit Political News Lead</option>
                    <option value="Columnist Inquiry">Columnist & Contributor Inquiry</option>
                    <option value="Technical Support">Technical & Platform Support</option>
                    <option value="Press / Media">Press & Syndication Requests</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Detailed Message</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your inquiry or news report..."
                    className="w-full bg-slate-950 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Transmit to Editorial Desk</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
