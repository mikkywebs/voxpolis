'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ALL_COUNTRIES, CountryConfig } from '@/config/countries';
import { Mail, MapPin, Send, CheckCircle2, MessageSquare, ShieldCheck } from 'lucide-react';

export default function ContactPage() {
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(ALL_COUNTRIES[0]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

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
            Contact Voxpolis Desk
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto leading-relaxed">
            Have a question about our automated political briefings, coverage requests, or editorial inquiries? Reach out to our operational team.
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
                <a href="mailto:contact@voxpolis.app" className="text-blue-400 hover:underline font-bold text-sm">
                  contact@voxpolis.app
                </a>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Correction Requests</span>
                <a href="/corrections" className="text-cyan-400 hover:underline font-bold text-sm">
                  Submit a Correction →
                </a>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Operating Country</span>
                <div className="text-gray-200 font-medium flex items-center gap-1.5 mt-1">
                  <MapPin className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Abuja, Federal Capital Territory, Nigeria</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 font-semibold block mb-0.5">Response SLA</span>
                <p className="text-gray-300">Within 24 hours on business days for public inquiries.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/50 text-[11px] text-gray-300 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>Voxpolis operates an independent, automated political news pipeline serving readers across {ALL_COUNTRIES.length} countries.</span>
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
                  Thank you for contacting Voxpolis. Our desk team has received your message and will review it promptly.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setMessage(''); }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="font-extrabold text-base text-white border-b border-gray-800 pb-3">
                  Send Us a Direct Note
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Editorial Correction">Editorial Correction</option>
                    <option value="Country Coverage Request">Country Coverage Request</option>
                    <option value="Technical Bug / Feedback">Technical Bug / Feedback</option>
                    <option value="Legal / Privacy Notice">Legal / Privacy Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about your query or feedback..."
                    className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Sending...' : 'Submit Message'}</span>
                  <Send className="w-3.5 h-3.5" />
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
