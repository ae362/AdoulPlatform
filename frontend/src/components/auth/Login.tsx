import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ReturnToLandingButton } from '../common/ReturnToLandingButton';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);

  const { login, user, sessionToken, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect helper based on user role
  const getRedirectPath = (userRole?: string) => {
    switch (userRole) {
      case 'authentication_judge': 
      case 'regional_judge':
      case 'supreme_judge':
        return '/judge';
      case 'notary': return '/notary-portal';
      case 'regional_adoul_council': return '/regional-council';
      case 'national_notary_authority': return '/national-council';
      case 'president_office': return '/president-office';
      case 'society_member': return '/society';
      case 'creator': return '/creator';
      default: return '/dashboard';
    }
  };

  // Load remembered email on component mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('rememberMe_email');
    const rememberMeFlag = localStorage.getItem('rememberMe_enabled') === 'true';
    if (storedEmail && rememberMeFlag) {
      setEmail(storedEmail);
      setRememberMe(true);
    }
    emailRef.current?.focus();
  }, []);

  // If already signed in, don't show login page
  useEffect(() => {
    if (!authLoading && sessionToken && user) {
      navigate(getRedirectPath(user.role), { replace: true });
    }
  }, [authLoading, sessionToken, user, navigate]);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !isLoading;
  }, [email, password, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Handle remember me - set flag for future logins
      if (rememberMe && email.trim()) {
        localStorage.setItem('rememberMe_email', email.trim());
        localStorage.setItem('rememberMe_enabled', 'true');
      } else {
        localStorage.removeItem('rememberMe_email');
        localStorage.removeItem('rememberMe_enabled');
      }

      const loggedInUser = await login(email, password, rememberMe);
      navigate(getRedirectPath(loggedInUser.role));
    } catch (err: any) {
      const message = String(err?.message || '');
      if (message.toLowerCase().includes('login failed')) {
        setError('تعذّر تسجيل الدخول. تحقّق من البريد الإلكتروني وكلمة المرور.');
      } else if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkerror')) {
        setError('تعذّر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت أو إعادة المحاولة لاحقاً.');
      } else {
        setError(message || 'حدث خطأ أثناء تسجيل الدخول.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle remember me toggle
  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    if (!checked) {
      // Clear all remember me data when unchecking
      localStorage.removeItem('rememberMe_email');
      localStorage.removeItem('rememberMe_enabled');
      localStorage.removeItem('rememberMe_session');
      localStorage.removeItem('rememberMe_expiry');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-slate-900" dir="rtl" lang="ar">
      <div className="relative isolate min-h-screen overflow-hidden">
        {/* Animated background gradients */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-rose-900/20 via-amber-600/15 to-amber-500/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 right-[-6rem] h-80 w-80 rounded-full bg-gradient-to-tr from-rose-800/15 via-amber-500/15 to-rose-700/15 blur-3xl animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.1)_1px,transparent_0)] [background-size:18px_18px] opacity-30" />
        </div>

        <ReturnToLandingButton className="absolute right-6 top-6 z-20" />

        <main className="relative mx-auto flex min-h-screen w-full flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          {/* Centered Form card */}
          <section className="flex w-full max-w-md flex-col justify-center">
            <div className="group relative">
              {/* Gradient border glow effect */}
              <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-rose-900/50 via-amber-700/50 to-rose-900/50 blur opacity-20 group-hover:opacity-40 transition duration-500" />
              
              <div className="relative rounded-3xl bg-white/98 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">
                {/* Logo Section at Top */}
                <div className="mb-8 flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center gap-4">
                    <img
                      src="/logos/adoul-logo.jpg"
                      alt="شعار الهيئة الوطنية للعدول"
                      className="h-20 w-auto object-contain rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-2 shadow-md ring-1 ring-slate-200 transition-transform duration-300 hover:scale-110"
                      loading="lazy"
                      decoding="async"
                    />
                    <img
                      src="/logos/morocco-coat.jpg"
                      alt="شعار المملكة المغربية"
                      className="h-20 w-20 object-contain rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-2 shadow-md ring-1 ring-slate-200 transition-transform duration-300 hover:scale-110"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm font-bold text-rose-900">الهيئة الوطنية للعدول</p>
                    <p className="text-xs text-amber-700 mt-1 font-medium">المملكة المغربية</p>
                  </div>
                </div>

                <div className="mb-8 text-right">
                  <h2 className="text-3xl font-bold tracking-tight text-white">تسجيل الدخول</h2>
                  <p className="mt-2 text-sm leading-relaxed text-amber-100">
                    استخدم بيانات دخولك للوصول إلى اللوحة الآمنة
                  </p>
                </div>

                {error && (
                  <div
                    className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-right text-sm text-red-800 shadow-sm"
                    role="alert"
                  >
                    <div className="flex items-start gap-3">
                      <svg className="h-5 w-5 shrink-0 text-red-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="mb-2.5 block text-right text-sm font-semibold text-white">
                      البريد الإلكتروني
                    </label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-rose-700/20 to-amber-600/20 opacity-0 group-focus-within:opacity-100 transition duration-300 blur`} />
                      <div className="relative">
                        <input
                          ref={emailRef}
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setEmailFocused(true)}
                          onBlur={() => setEmailFocused(false)}
                          required
                          autoComplete="email"
                          className={`h-12 w-full rounded-xl border-2 bg-white pl-11 pr-4 text-left text-slate-900 shadow-sm outline-none transition-all duration-200 ${ 
                            emailFocused
                              ? 'border-rose-900 ring-4 ring-rose-200/50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          placeholder="example@domain.com"
                          dir="ltr"
                          inputMode="email"
                        />
                        <div className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${emailFocused ? 'text-amber-600' : 'text-amber-700/60'}`}>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2.5 flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-semibold text-white">
                        كلمة المرور
                      </label>
                    </div>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-rose-700/20 to-amber-600/20 opacity-0 group-focus-within:opacity-100 transition duration-300 blur`} />
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setPasswordFocused(true)}
                          onBlur={() => setPasswordFocused(false)}
                          required
                          autoComplete="current-password"
                          dir="ltr"
                          style={{
                            fontFamily: showPassword
                              ? 'inherit'
                              : 'caption, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                          }}
                          className={`h-12 w-full rounded-xl border-2 bg-white pl-12 pr-11 text-left text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                            !showPassword ? 'tracking-wider' : ''
                          } ${
                            passwordFocused
                              ? 'border-rose-900 ring-4 ring-rose-200/50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-700 hover:text-amber-600 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                          aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                        >
                          {showPassword ? (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                              <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm5.31-7.78l3.15 3.15.02-.02c1.25 1.03 2.23 2.34 2.77 3.9 1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l3.15 3.15 2.46 2.46z" />
                            </svg>
                          )}
                        </button>
                        <div className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${passwordFocused ? 'text-amber-600' : 'text-amber-700/60'}`}>
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5s-5 2.24-5 5v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2.5 text-sm text-amber-100 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => handleRememberMeChange(e.target.checked)}
                        className="h-4 w-4 rounded border-amber-600 bg-white/5 text-amber-600 focus:ring-amber-500 transition cursor-pointer accent-amber-600"
                      />
                      <span className="group-hover:text-white transition">تذكرني</span>
                    </label>
                    <a
                      className="text-sm font-medium text-amber-400 underline decoration-amber-400/30 underline-offset-4 hover:text-amber-300 hover:decoration-amber-400 transition-all"
                      href="mailto:support@adoul.ma?subject=%D8%AF%D8%B9%D9%85%20%D8%AA%D8%B3%D8%AC%D9%8A%D9%84%20%D8%A7%D9%84%D8%AF%D8%AE%D9%88%D9%84"
                    >
                      هل نسيت كلمة المرور؟
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className={`group relative w-full h-12 rounded-xl font-semibold shadow-lg transition-all duration-200 overflow-hidden ${ 
                      canSubmit
                        ? 'bg-gradient-to-r from-rose-900 to-rose-800 text-white shadow-rose-900/30 hover:shadow-rose-900/50 hover:from-rose-800 hover:to-rose-700 active:scale-95'
                        : 'bg-rose-700 text-white/80 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 bg-white/20" />
                    <div className="relative flex items-center justify-center gap-2">
                      {isLoading && (
                        <span
                          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                          aria-hidden="true"
                        />
                      )}
                      <span>{isLoading ? 'جاري تسجيل الدخول…' : 'تسجيل الدخول'}</span>
                    </div>
                  </button>
                </form>

                <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-amber-100">
                  <span>ليس لديك حساب؟ </span>
                  <Link to="/register" className="font-semibold text-amber-400 hover:text-amber-300 underline decoration-amber-400/50 underline-offset-2 transition-colors">
                    إنشاء حساب
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
