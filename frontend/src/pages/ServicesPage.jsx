import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const services = [
  {
    title: 'One-on-One Tutoring',
    icon: '👤',
    color: 'from-rw-blue to-rw-blue-dark',
    description: 'Personalized attention with expert tutors who adapt to your learning style. Our one-on-one sessions ensure you get the focused support you need to master any subject.',
    features: [
      'Custom learning plans tailored to your pace',
      'Direct interaction with qualified subject experts',
      'Flexible scheduling that fits your calendar',
      'Real-time feedback and progress tracking',
      'Focused attention with zero distractions',
    ],
  },
  {
    title: 'Group Tutoring',
    icon: '👥',
    color: 'from-rw-green to-rw-green-dark',
    description: 'Learn collaboratively with small groups of motivated students. Group tutoring fosters discussion, peer learning, and a supportive community environment.',
    features: [
      'Small groups of 3-5 students per session',
      'Collaborative problem-solving and discussions',
      'Reduced cost compared to private sessions',
      'Learn from peers\' questions and perspectives',
      'Team-based projects and activities',
    ],
  },
  {
    title: 'Test Preparation',
    icon: '📝',
    color: 'from-rw-yellow to-rw-yellow-dark',
    description: 'ACE your SAT, ACT, GRE, or any standardized test with proven strategies, practice exams, and personalized study plans designed to maximize your score.',
    features: [
      'Comprehensive coverage of all test sections',
      'Timed practice exams with detailed analytics',
      'Proven test-taking strategies and tips',
      'Targeted drills for weak areas',
      'Score improvement guarantee',
    ],
  },
  {
    title: 'Homework Help',
    icon: '📚',
    color: 'from-rw-blue to-rw-green',
    description: 'Stuck on an assignment? Get instant help from our tutors who guide you through difficult problems and help you build confidence in your abilities.',
    features: [
      'On-demand assistance when you need it',
      'Step-by-step guidance through challenging problems',
      'Concept clarification and deeper explanations',
      'Assignment review and feedback',
      'Study skill development',
    ],
  },
  {
    title: 'Online Learning',
    icon: '💻',
    color: 'from-rw-green to-rw-blue',
    description: 'Access high-quality tutoring from anywhere in the world. Our virtual classroom platform makes it easy to connect with tutors and learn remotely.',
    features: [
      'Interactive virtual whiteboard and tools',
      'Screen sharing and collaborative document editing',
      'Recorded sessions for later review',
      'Access to learning materials 24/7',
      'No commute — learn from home',
    ],
  },
  {
    title: 'Academic Coaching',
    icon: '🎯',
    color: 'from-rw-blue-dark to-rw-green-dark',
    description: 'Go beyond subject tutoring with holistic academic coaching that builds effective study habits, time management skills, and a growth mindset for lifelong success.',
    features: [
      'Study skills and time management training',
      'Goal setting and academic planning',
      'Motivation and accountability partnerships',
      'College and career guidance',
      'Stress management techniques',
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <section className="bg-gradient-to-br from-rw-blue via-rw-blue-dark to-rw-blue text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-sm font-semibold text-rw-yellow tracking-wide uppercase">What We Offer</span>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mt-3 mb-4">Our Services</h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto">
            Comprehensive tutoring solutions designed to help students at every level achieve their academic goals.
          </p>
        </div>
      </section>

      <section className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
          {services.map((s, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
              <div className={`bg-gradient-to-r ${s.color} p-6 sm:p-8`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{s.icon}</span>
                  <h2 className="text-2xl font-bold text-white">{s.title}</h2>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">{s.description}</p>
                <ul className="space-y-3">
                  {s.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <svg className="w-5 h-5 text-rw-green mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* About UPCOMRWANDA */}
        <div className="mt-16 bg-white dark:bg-gray-800 rounded-3xl p-10 sm:p-14 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="/logo.png" alt="UPCOMRWANDA" className="h-10 w-10 rounded-xl object-cover" />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">About UPCOMRWANDA</h2>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg mb-4">
              UPCOMRWANDA is a leading tutoring company dedicated to providing high-quality, personalized education to students of all levels. We connect learners with expert tutors for one-on-one sessions, group classes, test preparation, and academic coaching.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Our mission is to make quality education accessible to everyone, empowering students worldwide to achieve their academic goals and unlock their full potential. With over 500 expert tutors and a proven track record of student success, we are committed to transforming the way people learn.
            </p>
          </div>
        </div>

        <div className="mt-16 text-center bg-gradient-to-br from-rw-blue/5 to-rw-green/5 dark:from-rw-blue/10 dark:to-rw-green/10 rounded-3xl p-10 sm:p-14 border border-rw-blue/10 dark:border-rw-blue/20">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of students who have transformed their academic journey with UPCOMRWANDA.
          </p>
          <Link to="/register" className="inline-block px-8 py-4 bg-gradient-to-r from-rw-blue to-rw-blue-dark text-white font-semibold rounded-xl hover:from-rw-blue-dark hover:to-rw-blue transition-all shadow-lg shadow-rw-blue/25">
            Create Free Account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
