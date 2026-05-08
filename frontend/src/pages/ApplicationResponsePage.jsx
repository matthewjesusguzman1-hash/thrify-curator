import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ApplicationResponsePage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [applicantName, setApplicantName] = useState('');
  const [alreadyResponded, setAlreadyResponded] = useState(false);
  const [responseSubmitted, setResponseSubmitted] = useState(false);
  const [keepOnFile, setKeepOnFile] = useState(null);

  useEffect(() => {
    checkStatus();
  }, [token]);

  const checkStatus = async () => {
    try {
      const response = await axios.get(`${API}/api/application-response/${token}`);
      setApplicantName(response.data.applicant_name);
      setAlreadyResponded(response.data.already_responded);
      
      // Check if there's a response in the URL query params
      const urlResponse = searchParams.get('response');
      if (urlResponse && !response.data.already_responded) {
        // Auto-submit the response from the email link
        await submitResponse(urlResponse === 'yes');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'This link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async (keepIt) => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/application-response/${token}?response=${keepIt ? 'yes' : 'no'}`);
      setKeepOnFile(keepIt);
      setResponseSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Invalid</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (alreadyResponded && !responseSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Already Responded</h1>
          <p className="text-gray-600">
            You've already submitted your response. Thank you!
          </p>
        </div>
      </div>
    );
  }

  if (responseSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            {keepOnFile 
              ? "We'll keep your application on file and reach out if a matching position opens up."
              : "We've noted your preference. We wish you all the best in your job search!"
            }
          </p>
          <p className="text-sm text-gray-500">
            You can close this page now.
          </p>
        </div>
      </div>
    );
  }

  // Show the response form
  const firstName = applicantName?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hi {firstName}!</h1>
          <p className="text-gray-600 mt-2">
            Thank you for your interest in Thrifty Curator.
          </p>
        </div>

        {/* Response Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Would you like us to keep your application on file?
          </h2>
          <p className="text-gray-600 mb-6">
            If a position opens up that matches your skills in the future, we'd love to reach out to you directly.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => submitResponse(true)}
              disabled={submitting}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Yes, keep my application on file
            </button>
            
            <button
              onClick={() => submitResponse(false)}
              disabled={submitting}
              className="w-full py-4 px-6 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
            >
              No thanks, you can remove it
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Questions? Visit our <a href="https://thrifty-curator.com/contact" className="text-purple-600 hover:underline">contact page</a>.
        </p>
      </div>
    </div>
  );
}
