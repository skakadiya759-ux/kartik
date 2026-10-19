import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Trophy,
  Medal,
  Award,
  Shirt,
  Sparkles,
  CheckCircle2,
  MapPin,
  Calendar,
  ArrowRight,
  Compass,
  GraduationCap,
  Briefcase,
  Star,
  X,
  ExternalLink,
} from 'lucide-react';
import { DevotionalImage } from '../components/DevotionalImage';

interface RewardsPageProps {
  onJoinClick: () => void;
}

interface MentorDetail {
  rankBadge: string;
  rankColor: string;
  rankBg: string;
  name: string;
  title: string;
  icon: string;
  credentials: string[];
  bio: string;
  mentorshipFocus: string;
}

const MENTORS_DATA: Record<string, MentorDetail> = {
  rasaParayana: {
    rankBadge: '🥇 1st Place Exclusive Honor',
    rankColor: '#92400E',
    rankBg: '#FEF3C7',
    name: 'His Grace Rasa Parayana Prabhu',
    title: 'FOLK Youth Guide • Executive Committee Member, HKM Gujarat',
    icon: '👑',
    credentials: [
      'B.Tech Mechanical Engineering',
      'Ex-Accenture & Essar Steel',
      'Akshaya Patra Foundation Member',
      'Speaker at Premier Institutes Across India',
    ],
    bio: 'Rasa Parayana Prabhu brings a wealth of experience bridging both the corporate and spiritual realms. Holding a B.Tech in Mechanical Engineering, he worked with Essar Steel and Accenture, giving him profound insight into the challenges youth face in modern careers. Inspired by the Bhagavad Gita and his spiritual master Srila Prabhupada, he delivers transformative "Career cum Life" lectures at premier institutes nationwide, passionately advocating for youth empowerment and spiritual success.',
    mentorshipFocus:
      'Private 1:1 guidance on harmonizing high-impact corporate/academic careers with uncompromising spiritual vows, deep japa meditation, and life purpose realization.',
  },
  hrishikesh: {
    rankBadge: '🥈 2nd Place Exclusive Honor',
    rankColor: '#334155',
    rankBg: '#F1F5F9',
    name: 'His Grace Hrishikesh Karunamay Dasa',
    title: 'Youth Devotee Guide & Mentor • Devoted Spiritual Teacher',
    icon: '⭐',
    credentials: [
      'NIT Surat (Civil Engineering)',
      '1st Best Intern Award Recipient',
      'Bhagavad Gita Wisdom Teacher',
      'Habit & Sadhana Mastery Coach',
    ],
    bio: 'With an engineering foundation from NIT Surat, Hrishikesh Karunamay Dasa was recognized early with the prestigious 1st Best Intern Award for his exceptional commitment and selfless service. Rooted in the Bhagavad Gita, he radiates compassion and practical wisdom, inspiring youth to bridge material problem-solving with a purposeful spiritual life.',
    mentorshipFocus:
      'Personalized 1:1 counseling on habit mastery, overcoming mental blocks in meditation, building unwavering sadhana consistency, and living with transcendental purpose.',
  },
  dindayal: {
    rankBadge: '🥉 3rd Place Exclusive Honor',
    rankColor: '#7C2D12',
    rankBg: '#FFEDD5',
    name: 'His Grace Dindayal Prabhu',
    title: 'Senior FOLK Youth Counselor & Sadhana Guide',
    icon: '🌟',
    credentials: [
      'Senior FOLK Youth Counselor',
      'Sadhana Consistency Coach',
      'Student & Career Life Balance Mentor',
      'Japa Meditation Guide',
    ],
    bio: 'A beloved senior counselor and mentor within the FOLK youth movement, devoted to guiding students and young working professionals. He specializes in practical time management, overcoming distractions, and cultivating steady, joyful daily chanting and scriptural study.',
    mentorshipFocus:
      '1:1 coaching on maintaining joyful consistency in chanting, time management for college/work, and cultivating strong devotional community support.',
  },
};

export const RewardsPage = ({ onJoinClick }: RewardsPageProps) => {
  const [selectedMentor, setSelectedMentor] = useState<MentorDetail | null>(null);

  return (
    <div className="page-container animate-fade-in">
      {/* Page Title & Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.75rem' }}>

        <h1
          className="heading-editorial"
          style={{
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            color: 'var(--text-primary)',
            marginTop: '0.25rem',
            lineHeight: 1.15,
          }}
        >
          Kartik 2026 Podium Rewards
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.98rem',
            maxWidth: '680px',
            margin: '0.65rem auto 0',
            lineHeight: 1.65,
          }}
        >
          Dedicated Kartik practice brings transcendental rewards! Top 3 rank holders earn Sri Mayapur Yatra discounts, official merchandise, and exclusive 1:1 mentorship with senior monastic leaders.
        </p>
      </div>

      {/* Rewards Podium Grid: 1st, 2nd, 3rd Place */}
      <div className="rewards-podium-grid">
        {/* ================================================================= */}
        {/* 1st Place — Gold Accent (Grand Champion)                         */}
        {/* ================================================================= */}
        <div
          className="reward-card-glass reward-gold"
          style={{
            border: '2px solid rgba(217, 119, 6, 0.45)',
            boxShadow: '0 16px 44px -4px rgba(217, 119, 6, 0.18), 0 4px 12px rgba(0, 0, 0, 0.03)',
            background: 'linear-gradient(180deg, rgba(255, 253, 245, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          <div className="reward-top-bar bar-gold" />

          {/* Top Rank Badge */}
          <div style={{ marginBottom: '1rem' }}>
            <span
              className="glass-pill"
              style={{
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                color: '#92400E',
                borderColor: '#F59E0B',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
              }}
            >
              🥇 1st Place • Grand Champion
            </span>
          </div>

          {/* Gold Emblem */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)',
              border: '3px solid #FEF3C7',
            }}
          >
            <Trophy size={34} strokeWidth={2.2} />
          </div>

          <h3
            style={{
              fontSize: '1.45rem',
              color: 'var(--text-primary)',
              marginBottom: '0.25rem',
              fontWeight: 800,
            }}
          >
            1st Place Reward
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Rank #1 on Final Verified Leaderboard
          </p>

          {/* Reward 1: 100% Mayapur Trip Sponsorship */}
          <div
            style={{
              padding: '1.15rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1px solid rgba(217, 119, 6, 0.35)',
              marginBottom: '0.85rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.3rem',
                color: '#92400E',
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              100% OFF
            </div>
            <div
              style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: '#78350F',
                marginTop: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <MapPin size={15} />
              Mayapur Trip (Full Sponsorship)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '0.25rem' }}>
              Registration, stay &amp; holy yatra fully covered
            </div>
          </div>

          {/* Detailed Inclusions List */}
          <ul
            style={{
              listStyle: 'none',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.86rem',
              color: 'var(--text-primary)',
              marginTop: 'auto',
              paddingTop: '1rem',
              borderTop: '1px dashed rgba(217, 119, 6, 0.3)',
            }}
          >
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#D97706" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <span><strong>Official Challenge Hoodie</strong> (Embroidered FOLK Edition)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#D97706" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <div>
                <span>
                  Private 1:1 Mentorship with{' '}
                  <button
                    onClick={() => setSelectedMentor(MENTORS_DATA.rasaParayana)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#B45309',
                      fontWeight: 800,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    HG Rasa Parayana Prabhu
                    <ExternalLink size={12} />
                  </button>
                </span>
                <div style={{ fontSize: '0.76rem', color: '#B45309', marginTop: '0.2rem' }}>
                  B.Tech Mech • Ex-Accenture / Essar Steel • Akshaya Patra
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* ================================================================= */}
        {/* 2nd Place — Silver Accent (1st Runner Up)                        */}
        {/* ================================================================= */}
        <div
          className="reward-card-glass reward-silver"
          style={{
            border: '1.5px solid rgba(100, 116, 139, 0.35)',
            boxShadow: '0 12px 36px -4px rgba(100, 116, 139, 0.14), 0 2px 6px rgba(0, 0, 0, 0.02)',
            background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          <div className="reward-top-bar bar-silver" />

          {/* Top Rank Badge */}
          <div style={{ marginBottom: '1rem' }}>
            <span
              className="glass-pill"
              style={{
                background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
                color: '#334155',
                borderColor: '#94A3B8',
              }}
            >
              🥈 2nd Place • 1st Runner Up
            </span>
          </div>

          {/* Silver Emblem */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #94A3B8 0%, #64748B 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 6px 20px rgba(100, 116, 139, 0.25)',
              border: '3px solid #F1F5F9',
            }}
          >
            <Medal size={34} strokeWidth={2.2} />
          </div>

          <h3
            style={{
              fontSize: '1.45rem',
              color: 'var(--text-primary)',
              marginBottom: '0.25rem',
              fontWeight: 800,
            }}
          >
            2nd Place Reward
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Rank #2 on Final Verified Leaderboard
          </p>

          {/* Reward 1: 75% Mayapur Trip Discount */}
          <div
            style={{
              padding: '1.15rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              marginBottom: '0.85rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.3rem',
                color: '#334155',
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              75% OFF
            </div>
            <div
              style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: '#1E293B',
                marginTop: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <MapPin size={15} />
              Mayapur Trip (75% Discount)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
              75% subsidy on Mayapur Yatra pilgrimage package
            </div>
          </div>

          {/* Detailed Inclusions List */}
          <ul
            style={{
              listStyle: 'none',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.86rem',
              color: 'var(--text-primary)',
              marginTop: 'auto',
              paddingTop: '1rem',
              borderTop: '1px dashed rgba(100, 116, 139, 0.3)',
            }}
          >
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#64748B" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <span><strong>Official Challenge Hoodie</strong> (Embroidered FOLK Edition)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#64748B" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <div>
                <span>
                  Private 1:1 Mentorship with{' '}
                  <button
                    onClick={() => setSelectedMentor(MENTORS_DATA.hrishikesh)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#334155',
                      fontWeight: 800,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    HG Hrishikesh Karunamay Dasa
                    <ExternalLink size={12} />
                  </button>
                </span>
                <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '0.2rem' }}>
                  NIT Surat (Civil Engg) • 1st Best Intern Awardee
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* ================================================================= */}
        {/* 3rd Place — Bronze Accent (2nd Runner Up)                        */}
        {/* ================================================================= */}
        <div
          className="reward-card-glass reward-bronze"
          style={{
            border: '1.5px solid rgba(194, 65, 12, 0.35)',
            boxShadow: '0 12px 36px -4px rgba(194, 65, 12, 0.14), 0 2px 6px rgba(0, 0, 0, 0.02)',
            background: 'linear-gradient(180deg, rgba(255, 247, 237, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          }}
        >
          <div className="reward-top-bar bar-bronze" />

          {/* Top Rank Badge */}
          <div style={{ marginBottom: '1rem' }}>
            <span
              className="glass-pill"
              style={{
                background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)',
                color: '#7C2D12',
                borderColor: '#FB923C',
              }}
            >
              🥉 3rd Place • 2nd Runner Up
            </span>
          </div>

          {/* Bronze Emblem */}
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FB923C 0%, #C2410C 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 6px 20px rgba(194, 65, 12, 0.25)',
              border: '3px solid #FFEDD5',
            }}
          >
            <Award size={34} strokeWidth={2.2} />
          </div>

          <h3
            style={{
              fontSize: '1.45rem',
              color: 'var(--text-primary)',
              marginBottom: '0.25rem',
              fontWeight: 800,
            }}
          >
            3rd Place Reward
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Rank #3 on Final Verified Leaderboard
          </p>

          {/* Reward 1: 50% Mayapur Trip Discount */}
          <div
            style={{
              padding: '1.15rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
              border: '1px solid rgba(194, 65, 12, 0.3)',
              marginBottom: '0.85rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2.3rem',
                color: '#7C2D12',
                lineHeight: 1,
                fontWeight: 700,
              }}
            >
              50% OFF
            </div>
            <div
              style={{
                fontSize: '0.92rem',
                fontWeight: 800,
                color: '#7C2D12',
                marginTop: '0.35rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <MapPin size={15} />
              Mayapur Trip (50% Discount)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#9A3412', marginTop: '0.25rem' }}>
              50% subsidy on Mayapur Yatra pilgrimage package
            </div>
          </div>

          {/* Detailed Inclusions List */}
          <ul
            style={{
              listStyle: 'none',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              fontSize: '0.86rem',
              color: 'var(--text-primary)',
              marginTop: 'auto',
              paddingTop: '1rem',
              borderTop: '1px dashed rgba(194, 65, 12, 0.3)',
            }}
          >
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#C2410C" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <span><strong>Official Challenge Hoodie</strong> (Embroidered FOLK Edition)</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#C2410C" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
              <div>
                <span>
                  Private 1:1 Mentorship with{' '}
                  <button
                    onClick={() => setSelectedMentor(MENTORS_DATA.dindayal)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#9A3412',
                      fontWeight: 800,
                      textDecoration: 'underline',
                      textUnderlineOffset: '3px',
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    HG Dindayal Prabhu
                    <ExternalLink size={12} />
                  </button>
                </span>
                <div style={{ fontSize: '0.76rem', color: '#9A3412', marginTop: '0.2rem' }}>
                  Senior FOLK Youth Counselor • Sadhana &amp; Spiritual Lifestyle Coach
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Feature Showcase 2: Sri Mayapur Pilgrimage Experience */}
      <section
        className="glass-panel rewards-feature-section"
        style={{
          marginTop: '3.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '2.25rem',
          alignItems: 'center',
        }}
      >
        <div>
          <span className="glass-pill" style={{ marginBottom: '0.65rem' }}>
            <Compass size={13} color="#EA580C" />
            Sacred Destination
          </span>
          <h2
            className="heading-editorial"
            style={{ fontSize: '2.2rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}
          >
            Sri Mayapur Chandrodaya Dham
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.96rem',
              lineHeight: 1.65,
              margin: '0.85rem 0 1.25rem',
            }}
          >
            Situated on the sacred banks of the Ganges in West Bengal, Sri Mayapur Dham is the spiritual headquarters
            of ISKCON and the appearance place of Sri Chaitanya Mahaprabhu. 1st, 2nd, and 3rd place winners receive
            100%, 75%, and 50% discount sponsorships respectively toward this unforgettable spiritual yatra.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.65rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 247, 237, 0.85)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--primary-orange-deep)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <CheckCircle2 size={15} color="var(--primary-orange)" />
              TOVP Mandir Darshan
            </div>
            <div
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 247, 237, 0.85)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--primary-orange-deep)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <CheckCircle2 size={15} color="var(--primary-orange)" />
              Holy Ganga Snan
            </div>
            <div
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 247, 237, 0.85)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--primary-orange-deep)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <CheckCircle2 size={15} color="var(--primary-orange)" />
              Navadvipa Parikrama
            </div>
            <div
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 247, 237, 0.85)',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--primary-orange-deep)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <CheckCircle2 size={15} color="var(--primary-orange)" />
              Ecstatic Kirtan Melas
            </div>
          </div>

          <button className="btn-glass-primary" onClick={onJoinClick}>
            <Sparkles size={16} />
            Log Daily Sadhana &amp; Qualify Today
            <ArrowRight size={16} />
          </button>
        </div>

        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '300px',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-glass)',
            border: '2px solid rgba(255, 255, 255, 0.9)',
          }}
        >
          <DevotionalImage
            src="/images/mayapur-tovp.jpg"
            alt="Sri Mayapur Temple of Vedic Planetarium"
            fallbackTitle="Sri Mayapur Chandrodaya Temple (TOVP)"
            aspectRatio="auto"
          />
        </div>
      </section>

      {/* Feature Showcase 3: The Official Challenge Hoodie (Golden Radiant Aesthetic) */}
      <section
        className="rewards-feature-section"
        style={{
          marginTop: '2.5rem',
          background: 'linear-gradient(135deg, rgba(255, 251, 235, 0.96) 0%, rgba(254, 243, 199, 0.9) 50%, rgba(253, 230, 138, 0.6) 100%)',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 16px 40px rgba(217, 119, 6, 0.12)',
          borderRadius: 'var(--radius-xl)',
          color: 'var(--text-primary)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '2.25rem',
          alignItems: 'center',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#92400E',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
            }}
          >
            <Shirt size={14} color="#D97706" />
            Exclusive Challenge Apparel
          </span>
          <h2
            className="heading-editorial"
            style={{ fontSize: '2.2rem', color: '#78350F', marginTop: '0.25rem', lineHeight: 1.15 }}
          >
            Official FOLK Challenge Hoodie
          </h2>
          <p
            style={{
              color: '#92400E',
              fontSize: '0.96rem',
              lineHeight: 1.65,
              margin: '1rem 0 1.5rem',
            }}
          >
            Awarded exclusively to our <strong>1st, 2nd, and 3rd Place winners</strong>. Crafted with premium heavyweight
            fleece in elegant ivory-cream, featuring the authentic gold embroidered <em>FOLK (Friends of Lord Krishna)</em> chest
            insignia and customized sizing.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#78350F',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: '1px solid rgba(245, 158, 11, 0.25)',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)',
              }}
            >
              ✨ 380 GSM Heavyweight Fleece
            </span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#78350F',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: '1px solid rgba(245, 158, 11, 0.25)',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)',
              }}
            >
              🧵 Gold Embroidered FOLK Crest
            </span>
            <span
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                color: '#78350F',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: '1px solid rgba(245, 158, 11, 0.25)',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.08)',
              }}
            >
              🎁 Custom Tailored Sizing
            </span>
          </div>
        </div>

        {/* Real Photo of Challenge Hoodie */}
        <div
          style={{
            position: 'relative',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '2.5px solid rgba(245, 158, 11, 0.45)',
            boxShadow: '0 14px 32px rgba(217, 119, 6, 0.16)',
            maxHeight: '340px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
          }}
        >
          <img
            src="/images/challenge-hoodie.jpg"
            alt="Official FOLK Challenge Hoodie"
            style={{
              width: '100%',
              height: '340px',
              objectFit: 'cover',
              objectPosition: 'center top',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '0.85rem 1rem',
              background: 'linear-gradient(180deg, transparent 0%, rgba(28, 25, 23, 0.85) 100%)',
              color: '#FFFFFF',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontWeight: 700, color: '#FDBA74' }}>FOLK Official Ivory Hoodie</span>
            <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>Podium Winner Exclusive</span>
          </div>
        </div>
      </section>

      {/* Award Ceremony Note */}
      <div
        className="glass-panel"
        style={{
          marginTop: '2.5rem',
          padding: '1.85rem 2.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 107, 0, 0.1)',
            color: 'var(--primary-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Calendar size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            Ceremonial Award Distribution at Kartik Mahotsav 2026
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.55 }}>
            All winners will be officially felicitated and awarded on the holy occasion of Kartik Purnima at the grand festival.
            Maintain regular sadhana entries to ensure eligibility.
          </div>
        </div>
      </div>

      {/* Mentor Bio & Details Popup Modal (Portaled directly to document.body for true viewport centering) */}
      {selectedMentor &&
        createPortal(
          <div
            className="modal-backdrop animate-fade-in"
            onClick={() => setSelectedMentor(null)}
          >
            <div
              className="mentor-modal-card glass-panel"
              onClick={(e) => e.stopPropagation()}
              style={{
                border: '2px solid rgba(255, 122, 26, 0.35)',
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: selectedMentor.rankColor,
                    background: selectedMentor.rankBg,
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-pill)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {selectedMentor.rankBadge}
                </span>
                <button
                  className="btn-modal-close"
                  onClick={() => setSelectedMentor(null)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mentor Title & Avatar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  marginBottom: '0.85rem',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: selectedMentor.rankBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.45rem',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                  }}
                >
                  {selectedMentor.icon}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      color: 'var(--text-primary)',
                      fontWeight: 800,
                      marginBottom: '0.15rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {selectedMentor.name}
                  </h3>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--primary-orange-deep)',
                      fontWeight: 700,
                    }}
                  >
                    {selectedMentor.title}
                  </div>
                </div>
              </div>

              {/* 4 Credentials Badges (Monk since xxx removed) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.35rem',
                  marginBottom: '0.85rem',
                }}
              >
                {selectedMentor.credentials.map((cred, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      padding: '0.28rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 122, 26, 0.08)',
                      color: 'var(--primary-orange-deep)',
                      border: '1px solid rgba(255, 122, 26, 0.16)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    {cred.includes('B.Tech') || cred.includes('NIT') ? (
                      <GraduationCap size={13} style={{ flexShrink: 0 }} />
                    ) : cred.includes('Accenture') ? (
                      <Briefcase size={13} style={{ flexShrink: 0 }} />
                    ) : (
                      <Sparkles size={12} style={{ flexShrink: 0 }} />
                    )}
                    <span>{cred}</span>
                  </span>
                ))}
              </div>

              {/* Biography (Concise) */}
              <div style={{ marginBottom: '0.85rem' }}>
                <p
                  style={{
                    fontSize: '0.84rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {selectedMentor.bio}
                </p>
              </div>

              {/* 1:1 Consultation Scope */}
              <div
                style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  marginBottom: '1rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    color: '#92400E',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginBottom: '0.2rem',
                  }}
                >
                  <Star size={13} fill="#D97706" color="#D97706" />
                  1:1 Private Mentorship Consultation Scope
                </div>
                <div style={{ fontSize: '0.8rem', color: '#78350F', lineHeight: 1.45 }}>
                  {selectedMentor.mentorshipFocus}
                </div>
              </div>

              {/* Close Button */}
              {/* <button
                className="btn-glass-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}
                onClick={() => setSelectedMentor(null)}
              >
                Close Details
              </button> */}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
