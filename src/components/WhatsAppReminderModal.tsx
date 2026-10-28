import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Copy,
  Check,
  Flame,
  BookOpen,
  Award,
  Sparkles,
  Save,
  RotateCcw,
} from 'lucide-react';

export interface WhatsAppTargetDevotee {
  name: string;
  mobile: string;
  centre?: string;
  points?: number;
  date?: string;
}

interface WhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  devotee: WhatsAppTargetDevotee | null;
  defaultTemplate?: 'sadhana' | 'attendance' | 'appreciation';
  customDate?: string;
}

const STORAGE_CUSTOM_TEMPLATE_KEY = 'kartik_saved_custom_whatsapp_template';

const DEFAULT_CUSTOM_TEMPLATE = `Hare Krishna {name} ji! 🙏

Kartik Maha-Vrata ka sadhana log portal par submit karne ke liye ek gentle reminder:
👉 {link}

Kripya apna daily Japa aur Reading record karein.
May Sri Sri Radha Damodara bless you! 🪔✨`;

export const WhatsAppReminderModal: React.FC<WhatsAppReminderModalProps> = ({
  isOpen,
  onClose,
  devotee,
  defaultTemplate = 'sadhana',
  customDate,
}) => {
  const [activeTemplate, setActiveTemplate] = useState<
    'custom' | 'sadhana' | 'attendance' | 'appreciation'
  >('custom');
  const [messageText, setMessageText] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load custom template from localStorage or fallback
  const getSavedCustomTemplate = (): string => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_TEMPLATE_KEY);
      return saved || DEFAULT_CUSTOM_TEMPLATE;
    } catch {
      return DEFAULT_CUSTOM_TEMPLATE;
    }
  };

  // Replace placeholders with real participant values
  const fillVariables = (
    template: string,
    d: WhatsAppTargetDevotee,
    dateStr?: string
  ): string => {
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    const portalUrl = 'https://kartik-challenge.vercel.app';

    return template
      .replace(/{name}/gi, d.name || 'Devotee')
      .replace(/{mobile}/gi, d.mobile || '')
      .replace(/{centre}/gi, d.centre || 'FOLK')
      .replace(/{points}/gi, String(d.points || 0))
      .replace(/{date}/gi, todayStr)
      .replace(/{link}/gi, portalUrl);
  };

  const generateTemplate = (
    type: 'custom' | 'sadhana' | 'attendance' | 'appreciation',
    d: WhatsAppTargetDevotee,
    dateStr?: string
  ): string => {
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    const portalUrl = 'https://kartik-challenge.vercel.app';

    switch (type) {
      case 'custom': {
        const rawCustom = getSavedCustomTemplate();
        return fillVariables(rawCustom, d, dateStr);
      }
      case 'sadhana':
        return `Hare Krishna ${d.name} prabhuji/mataji! 🙏\n\nThis is a gentle reminder from the Kartik Challenge team. Please remember to log your daily Sadhana (Japa rounds & Scripture reading) for today (${todayStr}) on the portal:\n👉 ${portalUrl}\n\nMay Sri Sri Radha Damodara bless your devotional service! 🪔✨`;

      case 'attendance':
        return `Hare Krishna ${d.name} prabhuji/mataji! 🙏\n\nToday's Kartik Shravanam & Damodarashtakam reading session (${todayStr}) is scheduled. Please join the session and confirm your attendance on the portal to receive +25 spiritual points!\n👉 ${portalUrl}\n\nHare Krishna! 📿📖`;

      case 'appreciation':
        return `Hare Krishna ${d.name} ji! 🌟\n\nHaribol! Outstanding dedication to your Kartik Vrata. You have accumulated ${d.points || 0} spiritual points so far on the leaderboard! Keep inspiring everyone with your steady chanting and reading.\n👉 Check standings: ${portalUrl}\n\nJai Sri Damodara! 🪔✨`;
    }
  };

  useEffect(() => {
    if (!devotee) return;

    // Default to 'custom' so the admin can write whatever they want directly
    const initialTpl = defaultTemplate === 'attendance' ? 'attendance' : 'custom';
    setActiveTemplate(initialTpl);
    const text = generateTemplate(initialTpl, devotee, customDate);
    setMessageText(text);
    setCopied(false);
    setSavedSuccess(false);
  }, [devotee, defaultTemplate, customDate]);

  const handleTemplateChange = (
    type: 'custom' | 'sadhana' | 'attendance' | 'appreciation'
  ) => {
    setActiveTemplate(type);
    if (devotee) {
      setMessageText(generateTemplate(type, devotee, customDate));
    }
  };

  // Insert dynamic placeholder tags at cursor position
  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) {
      setMessageText((prev) => prev + tag);
      return;
    }

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = messageText;

    // Insert actual value if participant is known, or insert variable
    let insertion = tag;
    if (devotee) {
      if (tag === '{name}') insertion = devotee.name;
      else if (tag === '{centre}') insertion = devotee.centre || '';
      else if (tag === '{points}') insertion = String(devotee.points || 0);
      else if (tag === '{link}') insertion = 'https://kartik-challenge.vercel.app';
      else if (tag === '{date}')
        insertion = customDate || new Date().toISOString().split('T')[0];
    }

    const updated = current.substring(0, start) + insertion + current.substring(end);
    setMessageText(updated);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + insertion.length,
          start + insertion.length
        );
      }
    }, 0);
  };

  // Save current message as custom template for future devotees
  const handleSaveAsDefaultCustom = () => {
    try {
      // If the message has devotee's name, suggest template format with {name}
      let templateToSave = messageText;
      if (devotee?.name && templateToSave.includes(devotee.name)) {
        templateToSave = templateToSave.replace(new RegExp(devotee.name, 'g'), '{name}');
      }
      localStorage.setItem(STORAGE_CUSTOM_TEMPLATE_KEY, templateToSave);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to save template', e);
    }
  };

  const handleResetToDefault = () => {
    if (!devotee) return;
    const t = fillVariables(DEFAULT_CUSTOM_TEMPLATE, devotee, customDate);
    setMessageText(t);
  };

  const cleanPhone = devotee?.mobile ? devotee.mobile.replace(/\D/g, '') : '';
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleSendWhatsApp = () => {
    if (!formattedPhone) return;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  if (!isOpen || !devotee) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          padding: '1.75rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
              }}
            >
              <MessageCircle size={22} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Personalized WhatsApp Message
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                Sending to: <strong style={{ color: 'var(--text-primary)' }}>{devotee.name}</strong> ({devotee.mobile})
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-modal-close-round"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Selector Tabs */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '0.45rem',
              letterSpacing: '0.04em',
            }}
          >
            Select or Customize Message:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            <button
              type="button"
              className={`whatsapp-template-tab ${
                activeTemplate === 'custom' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('custom')}
            >
              <Sparkles
                size={14}
                style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}
              />
              ✍️ Custom (Mera Message)
            </button>

            <button
              type="button"
              className={`whatsapp-template-tab ${
                activeTemplate === 'sadhana' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('sadhana')}
            >
              <Flame
                size={14}
                style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}
              />
              Sadhana Reminder
            </button>

            <button
              type="button"
              className={`whatsapp-template-tab ${
                activeTemplate === 'attendance' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('attendance')}
            >
              <BookOpen
                size={14}
                style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}
              />
              Reading Session
            </button>

            <button
              type="button"
              className={`whatsapp-template-tab ${
                activeTemplate === 'appreciation' ? 'active' : ''
              }`}
              onClick={() => handleTemplateChange('appreciation')}
            >
              <Award
                size={14}
                style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}
              />
              Kudos & Points
            </button>
          </div>
        </div>

        {/* Quick Insert Variables Toolbar */}
        <div
          style={{
            background: 'rgba(28, 25, 23, 0.04)',
            padding: '0.55rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            Insert Details:
          </span>
          <button
            type="button"
            className="quick-chip"
            style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}
            onClick={() => handleInsertTag('{name}')}
            title="Insert devotee name"
          >
            + Name ({devotee.name})
          </button>
          <button
            type="button"
            className="quick-chip"
            style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}
            onClick={() => handleInsertTag('{centre}')}
            title="Insert centre name"
          >
            + Centre ({devotee.centre || 'FOLK'})
          </button>
          <button
            type="button"
            className="quick-chip"
            style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}
            onClick={() => handleInsertTag('{points}')}
            title="Insert devotee total points"
          >
            + Score ({devotee.points || 0} pts)
          </button>
          <button
            type="button"
            className="quick-chip"
            style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}
            onClick={() => handleInsertTag('{link}')}
            title="Insert portal website link"
          >
            + Website Link
          </button>
        </div>

        {/* Message Editor Textarea */}
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.35rem',
            }}
          >
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              Apna Message Likhein (Edit anytime):
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleResetToDefault}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
                title="Reset to sample message"
              >
                <RotateCcw size={11} /> Reset
              </button>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {messageText.length} characters
              </span>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            className="input-glass"
            style={{
              width: '100%',
              minHeight: '150px',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              lineHeight: 1.55,
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(28, 25, 23, 0.18)',
              resize: 'vertical',
              boxSizing: 'border-box',
              background: '#FFFFFF',
            }}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Aap yahan Hindi, Hinglish ya English mein jo chahein likh sakte hain..."
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.35rem',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              💡 Ye message directly <strong>{devotee.name}</strong> ke WhatsApp par send hoga.
            </span>
            <button
              type="button"
              onClick={handleSaveAsDefaultCustom}
              style={{
                background: 'none',
                border: 'none',
                color: savedSuccess ? '#059669' : 'var(--primary-orange-deep)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              title="Save this message format as default for all devotees"
            >
              {savedSuccess ? <Check size={13} color="#059669" /> : <Save size={13} />}
              {savedSuccess ? 'Saved as My Message!' : '💾 Save this message for all devotees'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(28, 25, 23, 0.08)',
          }}
        >
          <button
            type="button"
            className="quick-chip"
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.95rem',
            }}
          >
            {copied ? <Check size={16} color="#059669" /> : <Copy size={16} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
          </button>

          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button
              type="button"
              className="quick-chip"
              onClick={onClose}
              style={{ padding: '0.55rem 1rem' }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn-whatsapp"
              onClick={handleSendWhatsApp}
              style={{ padding: '0.6rem 1.4rem', fontSize: '0.92rem' }}
            >
              <Send size={16} />
              Send to {devotee.name.split(' ')[0]} via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
