import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Send, ChevronDown, ChevronUp, Sparkles, 
  Loader2, MessageSquare, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ReportsAssistantSection({ getAuthHeader }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isExpanded && suggestedQuestions.length === 0) {
      fetchSuggestedQuestions();
    }
  }, [isExpanded]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSuggestedQuestions = async () => {
    try {
      const response = await axios.get(
        `${API}/api/reports-assistant/suggested-questions`,
        getAuthHeader()
      );
      setSuggestedQuestions(response.data.questions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const askQuestion = async (q = question) => {
    if (!q.trim()) return;

    const userQuestion = q.trim();
    setQuestion('');
    setConversation(prev => [...prev, { type: 'user', text: userQuestion }]);
    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/api/reports-assistant/ask`,
        { question: userQuestion },
        getAuthHeader()
      );
      
      setConversation(prev => [...prev, { 
        type: 'assistant', 
        text: response.data.answer,
        data: response.data.data_summary
      }]);
    } catch (error) {
      console.error('Error asking question:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to get response';
      setConversation(prev => [...prev, { 
        type: 'error', 
        text: errorMsg
      }]);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-white/20 overflow-hidden">
      {/* Collapsible Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="reports-assistant-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
              Reports Assistant
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </h2>
            <p className="text-sm text-gray-500">Ask questions about your business</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t">
              {/* Suggested Questions */}
              {conversation.length === 0 && suggestedQuestions.length > 0 && (
                <div className="mb-4 mt-4">
                  <p className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                    <HelpCircle className="w-4 h-4" /> Try asking:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.slice(0, 4).map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => askQuestion(q)}
                        disabled={loading}
                        className="text-xs px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full hover:bg-violet-100 transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversation */}
              <div className="bg-gray-50 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto mb-4">
                {conversation.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[180px] text-gray-400">
                    <MessageSquare className="w-12 h-12 mb-2 opacity-30" />
                    <p className="text-sm">Ask me anything about your business!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversation.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                          msg.type === 'user' 
                            ? 'bg-violet-500 text-white' 
                            : msg.type === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-white border shadow-sm text-gray-800'
                        }`}>
                          {msg.type === 'assistant' && (
                            <div className="flex items-center gap-1 text-violet-600 text-xs mb-1">
                              <Bot className="w-3 h-3" /> Assistant
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white border shadow-sm rounded-2xl px-4 py-3">
                          <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about payroll, applications, interviews..."
                  disabled={loading}
                  className="flex-1"
                  data-testid="reports-question-input"
                />
                <Button
                  onClick={() => askQuestion()}
                  disabled={loading || !question.trim()}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4"
                  data-testid="reports-ask-btn"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* More suggestions */}
              {conversation.length > 0 && suggestedQuestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1">More questions:</p>
                  <div className="flex flex-wrap gap-1">
                    {suggestedQuestions.slice(4).map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => askQuestion(q)}
                        disabled={loading}
                        className="text-xs px-2 py-1 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
