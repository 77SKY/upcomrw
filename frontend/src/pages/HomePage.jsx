import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const quotes = [
  { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X" },
  { text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The only way to do great work is to love what you learn.", author: "Steve Jobs" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
];

const services = [
  { title: "Mathematics", description: "From algebra to calculus, master every concept with personalized guidance from expert tutors.", icon: "📐", color: "from-rw-blue to-rw-blue-dark" },
  { title: "Science", description: "Explore physics, chemistry, and biology through engaging experiments and clear explanations.", icon: "🔬", color: "from-rw-green to-rw-green-dark" },
  { title: "Languages", description: "Become fluent in any language with native speakers and immersive learning techniques.", icon: "🌍", color: "from-rw-yellow to-rw-yellow-dark" },
  { title: "Test Prep", description: "Get ready for primary and secondary school exams with guided practice, mock tests, and effective study techniques.", icon: "📝", color: "from-rw-blue to-rw-green" },
  { title: "Writing", description: "Craft compelling essays and develop powerful writing skills that stand out.", icon: "✍️", color: "from-rw-green to-rw-blue" },
  { title: "Programming", description: "Learn to code in Python, JavaScript, and more with hands-on projects and mentorship.", icon: "💻", color: "from-rw-blue-dark to-rw-green-dark" },
];

const stats = [
  { value: "10K+", label: "Students" },
  { value: "500+", label: "Expert Tutors" },
  { value: "98%", label: "Satisfaction" },
  { value: "50+", label: "Subjects" },
];

export default function HomePage() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIndex(prev => (prev + 1) % quotes.length);
        setFade(true);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rw-blue via-rw-blue-dark to-rw-blue text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-rw-yellow rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-rw-green rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6 sm:mb-8">
              <span className="w-2 h-2 bg-rw-yellow rounded-full animate-pulse"></span>
              <span className="text-xs sm:text-sm font-medium text-white/90">Trusted by 10,000+ Students Worldwide</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
              Unlock Your
              <span className="block bg-gradient-to-r from-rw-yellow via-rw-green to-white bg-clip-text text-transparent">
                Full Potential
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8 sm:mb-10 leading-relaxed max-w-2xl mx-auto">
              Expert tutoring tailored to your unique learning style. Achieve your academic goals with personalized 1-on-1 sessions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-rw-yellow text-gray-900 font-semibold rounded-xl hover:bg-rw-yellow-light shadow-xl shadow-black/10 transition-all hover:scale-105 text-center">
                Start Learning Free
              </Link>
              <a href="#services" className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-center">
                Explore Services
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-12 sm:py-16 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-rw-blue/5 to-rw-green/5 dark:from-rw-blue/10 dark:to-rw-green/10 rounded-2xl sm:rounded-3xl p-8 sm:p-12 border border-rw-blue/10 dark:border-rw-blue/20">
            <svg className="w-10 h-10 sm:w-12 h-12 text-rw-blue mx-auto mb-4 sm:mb-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            <div className={`transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-800 dark:text-gray-200 leading-relaxed mb-4 sm:mb-6 italic">
                "{quotes[quoteIndex].text}"
              </p>
              <p className="text-base sm:text-lg font-semibold text-rw-blue">— {quotes[quoteIndex].author}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 sm:py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center p-4 sm:p-6">
                <div className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-1 sm:mb-2 ${
                  i % 3 === 0 ? 'text-rw-blue' : i % 3 === 1 ? 'text-rw-yellow-dark' : 'text-rw-green'
                }`}>
                  {stat.value}
                </div>
                <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-16 sm:py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-sm font-semibold text-rw-green tracking-wide uppercase">Our Services</span>
            <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Everything You Need
              <span className="block text-rw-blue">To Succeed</span>
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              Comprehensive tutoring services designed to help you excel in every subject.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {services.map((service, i) => (
              <div key={i} className="group relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 sm:p-8 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-2xl mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{service.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{service.description}</p>
                <div className="mt-5 flex items-center gap-1 text-rw-blue font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link to="/register">Learn more</Link>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-rw-blue via-rw-green to-rw-green">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-6">Ready to Start Learning?</h2>
          <p className="text-lg sm:text-xl text-white/90 mb-8 sm:mb-10 max-w-2xl mx-auto">
            Join thousands of students who have transformed their academic journey with UPCOMRWANDA.
          </p>
          <Link to="/register" className="inline-block px-10 py-4 bg-rw-yellow text-gray-900 font-semibold rounded-xl hover:bg-rw-yellow-light shadow-xl transition-all hover:scale-105 text-lg">
            Create Free Account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
