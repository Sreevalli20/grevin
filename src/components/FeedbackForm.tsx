import React, { useState } from 'react';
import { MessageSquare, Send, X, Star } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface FeedbackFormData {
  rating: number;
  whatWorks: string;
  whatNeedsImprovement: string;
  bugs: string;
  featureRequests: string;
}

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FeedbackFormData>({
    rating: 0,
    whatWorks: '',
    whatNeedsImprovement: '',
    bugs: '',
    featureRequests: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Save feedback to localStorage
      const existingFeedback = JSON.parse(localStorage.getItem('pivotos_feedback') || '[]');
      const newFeedback = {
        id: `feedback-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...formData,
      };
      existingFeedback.push(newFeedback);
      localStorage.setItem('pivotos_feedback', JSON.stringify(existingFeedback));

      showToast('success', 'Thank You!', 'Your feedback has been saved locally.');
      setFormData({
        rating: 0,
        whatWorks: '',
        whatNeedsImprovement: '',
        bugs: '',
        featureRequests: '',
      });
      onClose();
    } catch (error) {
      showToast('error', 'Save Failed', 'Could not save feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStarClick = (rating: number) => {
    setFormData({ ...formData, rating });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-teal-400" />
            <span>Share Your Feedback</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Overall Satisfaction
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= formData.rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* What Works Well */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              What Works Well?
            </label>
            <textarea
              value={formData.whatWorks}
              onChange={(e) => setFormData({ ...formData, whatWorks: e.target.value })}
              placeholder="Which features do you find most useful?"
              rows={3}
              className="w-full px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* What Needs Improvement */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              What Could Be Better?
            </label>
            <textarea
              value={formData.whatNeedsImprovement}
              onChange={(e) => setFormData({ ...formData, whatNeedsImprovement: e.target.value })}
              placeholder="What would you like to see improved?"
              rows={3}
              className="w-full px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* Bug Reports */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Any Issues or Bugs?
            </label>
            <textarea
              value={formData.bugs}
              onChange={(e) => setFormData({ ...formData, bugs: e.target.value })}
              placeholder="Describe any unexpected behavior or errors."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          {/* Feature Requests */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Feature Suggestions
            </label>
            <textarea
              value={formData.featureRequests}
              onChange={(e) => setFormData({ ...formData, featureRequests: e.target.value })}
              placeholder="What would you like to see added to PivotOS?"
              rows={2}
              className="w-full px-3 py-2 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium rounded border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.rating === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Submit Feedback'}</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            Your feedback is saved locally on this device. Export it from Settings if needed.
          </p>
        </form>
      </div>
    </div>
  );
};
