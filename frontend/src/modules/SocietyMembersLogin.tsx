import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const TXT = {
  back: '\u0627\u0644\u0639\u0648\u062f\u0629',
  headerKicker: '\u0627\u0644\u0647\u064a\u0626\u0629 \u0627\u0644\u0648\u0637\u0646\u064a\u0629 \u0644\u0644\u0639\u062f\u0648\u0644 \u2022 \u0641\u0636\u0627\u0621 \u0627\u0644\u0623\u0639\u0636\u0627\u0621',
  title: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 \u0641\u0636\u0627\u0621 \u0627\u0644\u0623\u0639\u0636\u0627\u0621',
  intro:
    '\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643\u0645. \u0627\u0644\u0648\u0644\u0648\u062c \u064a\u062a\u0645 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u060c \u0648\u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0645\u062e\u0635\u0635 \u0644\u0644\u0627\u0633\u062a\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0647\u0646\u064a \u0627\u0644\u062f\u0627\u062e\u0644\u064a \u0641\u0642\u0637.',
  help: '\u0644\u0644\u0645\u0633\u0627\u0639\u062f\u0629\u060c \u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064a\u062f:',
  notice: '\u062a\u0646\u0628\u064a\u0647: \u0645\u062d\u062a\u0648\u0649 \u0645\u062e\u0635\u0635 \u0644\u0644\u0623\u0639\u0636\u0627\u0621 \u0641\u0642\u0637 \u0648\u062e\u0627\u0636\u0639 \u0644\u0644\u0633\u0631\u064a\u0629 \u0627\u0644\u0645\u0647\u0646\u064a\u0629.',
  emailLabel: '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0623\u0648 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
  passwordLabel: '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  emailPlaceholder: '\u0623\u062f\u062e\u0644 \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a',
  passwordPlaceholder: '\u0623\u062f\u062e\u0644 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  showPassword: '\u0639\u0631\u0636 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  hidePassword: '\u0625\u062e\u0641\u0627\u0621 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631',
  resetInstructions: '\u062a\u0639\u0644\u064a\u0645\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u0631\u062c\u0627\u0639',
  login: '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644',
  loggingIn: '\u062c\u0627\u0631\u064a \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644...',
  wrongRole:
    '\u0647\u0630\u0627 \u0627\u0644\u062d\u0633\u0627\u0628 \u063a\u064a\u0631 \u0645\u062e\u0648\u0644 \u0644\u0644\u062f\u062e\u0648\u0644 \u0625\u0644\u0649 \u0641\u0636\u0627\u0621 \u0627\u0644\u0623\u0639\u0636\u0627\u0621.',
  genericError:
    '\u0641\u0634\u0644 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a \u0648\u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.',
} as const;

function roleLabel(role: string) {
  switch (role) {
    case 'notary':
      return '\u0639\u062f\u0644';
    case 'authentication_judge':
      return '\u0642\u0627\u0636\u064a \u0627\u0644\u062a\u0648\u062b\u064a\u0642';
    case 'government_authority':
      return '\u0633\u0644\u0637\u0629 \u062d\u0643\u0648\u0645\u064a\u0629';
    case 'national_notary_authority':
      return '\u0647\u064a\u0626\u0629 \u0648\u0637\u0646\u064a\u0629';
    case 'society_member':
      return '\u0639\u0636\u0648 \u0627\u0644\u062c\u0645\u0639\u064a\u0629';
    default:
      return role;
  }
}

export function SocietyMembersLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout, user, isAuthenticated } = useAuth();

  const [form, setForm] = React.useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated && user?.role === 'society_member') {
      navigate('/society', { replace: true, state: location.state });
    }
  }, [isAuthenticated, user?.role, navigate, location.state]);

  const handleReturn = () => {
    const state = location.state as { from?: string } | null;
    const from = state?.from;

    if (typeof from === 'string' && from.startsWith('/')) {
      navigate(from);
      return;
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/directory');
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const loggedInUser = await login(form.email.trim(), form.password);
      if (loggedInUser.role !== 'society_member') {
        await logout();
        setErrorMessage(`${TXT.wrongRole} (\u062f\u0648\u0631 \u0627\u0644\u062d\u0633\u0627\u0628: ${roleLabel(loggedInUser.role)})`);
        return;
      }
      navigate('/society', { replace: true, state: location.state });
    } catch (err: any) {
      setErrorMessage(err?.message ?? TXT.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = form.email.trim() === '' || form.password.trim() === '' || isSubmitting;

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <section className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[#d8c9a7] bg-gradient-to-br from-[#f9f6ef] via-[#f6f1e7] to-[#f3ecde] shadow-lg">
        <div className="grid md:grid-cols-2">
          <div className="relative bg-white/80 p-8 md:p-12">
            <button
              type="button"
              className="absolute right-6 top-6 hidden text-xs font-semibold text-blue-900 underline md:block"
              onClick={handleReturn}
            >
              {TXT.back}
            </button>

            <p className="mb-4 text-center text-[11px] font-semibold tracking-widest text-[#6d6a58]">{TXT.headerKicker}</p>
            <h3 className="mb-5 text-center font-serif text-3xl text-[#1f2a44] md:text-4xl">{TXT.title}</h3>
            <p className="mb-4 text-center text-sm leading-relaxed text-[#4d4b47]">{TXT.intro}</p>

            <div className="space-y-4 text-center text-sm text-[#5a564a]">
              <p>
                {TXT.help}{' '}
                <a href="mailto:support@adoul.ma" className="font-semibold text-blue-900 underline" dir="ltr">
                  support@adoul.ma
                </a>
              </p>
              <div className="border-t border-[#d8c9a7] pt-4 text-xs leading-relaxed text-[#7a7463]">{TXT.notice}</div>
            </div>
          </div>

          <div className="border-t border-[#e3d7bd] bg-[#fefaf1] p-8 md:border-l md:border-t-0 md:p-10">
            <form onSubmit={onSubmit} className="space-y-5">
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{errorMessage}</div>
              ) : null}

              <div>
                <label className="text-[11px] font-semibold tracking-widest text-[#6d6a58]">{TXT.emailLabel}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-[#d2c6ae] bg-white px-4 py-3 text-left text-sm shadow-inner focus:border-[#9c7b3b] focus:ring-0"
                  placeholder={TXT.emailPlaceholder}
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold tracking-widest text-[#6d6a58]">{TXT.passwordLabel}</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="mt-2 w-full rounded-md border border-[#d2c6ae] bg-white px-4 py-3 text-left text-sm shadow-inner focus:border-[#9c7b3b] focus:ring-0"
                  placeholder={TXT.passwordPlaceholder}
                  dir="ltr"
                />
                <div className="mt-2 flex items-center justify-between text-xs font-semibold tracking-wide text-[#1f3b7a]">
                  <button type="button" onClick={() => setShowPassword((p) => !p)} className="underline">
                    {showPassword ? TXT.hidePassword : TXT.showPassword}
                  </button>
                  <a
                    href="mailto:support@adoul.ma?subject=%D8%A7%D8%B3%D8%AA%D8%B1%D8%AC%D8%A7%D8%B9%20%D9%83%D9%84%D9%85%D8%A9%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%B1"
                    className="underline"
                  >
                    {TXT.resetInstructions}
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={disabled}
                className={`w-full rounded-md py-3 text-sm font-bold tracking-widest shadow-md transition-colors ${
                  disabled ? 'cursor-not-allowed bg-[#d3c7af] text-white' : 'bg-[#1f3b7a] text-white hover:bg-[#15285a]'
                }`}
              >
                {isSubmitting ? TXT.loggingIn : TXT.login}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
