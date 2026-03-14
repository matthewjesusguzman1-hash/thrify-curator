import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    sender_name: '',
    sender_email: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await axios.post(`${API}/api/messages`, formData);
      setSent(true);
      toast.success('Message sent successfully! We will review and respond soon.');
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error('Too many messages. Please wait a few minutes.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f1a]">
      {/* Header */}
      <div className="p-4">
        <Link to="/" className="inline-flex items-center text-white/70 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Contact Us</h1>
          <p className="text-white/60">We'd love to hear from you</p>
        </motion.div>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Message Sent!</h2>
            <p className="text-white/60 mb-6">We'll get back to you as soon as possible.</p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-600">
                Back to Home
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4"
          >
            <div>
              <label className="block text-white/80 text-sm mb-2">Your Name</label>
              <Input
                type="text"
                required
                value={formData.sender_name}
                onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Email Address</label>
              <Input
                type="email"
                required
                value={formData.sender_email}
                onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Message</label>
              <Textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none"
                placeholder="How can we help you?"
              />
            </div>

            <Button
              type="submit"
              disabled={sending}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3"
            >
              {sending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </span>
              )}
            </Button>
          </motion.form>
        )}

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-white/40 text-sm">
            You can also reach us at
          </p>
          <a href="mailto:thriftycurator1@gmail.com" className="text-pink-400 hover:text-pink-300 transition-colors">
            thriftycurator1@gmail.com
          </a>
        </motion.div>
      </div>
    </div>
  );
}
