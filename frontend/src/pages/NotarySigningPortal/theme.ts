/**
 * NotarySigningPortal Design System & Theme
 * Modern, secure, professional judicial digital identity
 */

export const designSystem = {
  colors: {
    primary: {
      gradient: 'from-blue-500 to-blue-600',
      light: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-600',
    },
    secondary: {
      gradient: 'from-purple-400 to-purple-500',
      light: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-600',
    },
    status: {
      signed: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-400',
        bar: 'bg-emerald-400',
        text: 'text-emerald-700',
        icon: 'text-emerald-500',
      },
      pending: {
        bg: 'bg-amber-50',
        border: 'border-amber-400',
        bar: 'bg-amber-400',
        text: 'text-amber-700',
        icon: 'text-amber-500',
      },
      archived: {
        bg: 'bg-blue-50',
        border: 'border-blue-400',
        bar: 'bg-blue-400',
        text: 'text-blue-700',
        icon: 'text-blue-500',
      },
    },
    alerts: {
      success: 'text-emerald-600 bg-emerald-50',
      warning: 'text-amber-600 bg-amber-50',
      error: 'text-red-600 bg-red-50',
      info: 'text-blue-600 bg-blue-50',
    },
    background: {
      light: 'bg-white',
      lighter: 'bg-slate-50',
      lightLight: 'bg-slate-100',
    },
  },

  categories: {
    marriage: {
      icon: '💍',
      label: 'رسوم الزواج',
      id: 'marriage',
      color: 'from-pink-500 to-rose-500',
      light: 'bg-rose-50',
    },
    divorce: {
      icon: '📜',
      label: 'رسوم الطلاق',
      id: 'divorce',
      color: 'from-orange-500 to-amber-500',
      light: 'bg-amber-50',
    },
    property: {
      icon: '🏠',
      label: 'رسوم الأملاك',
      id: 'property',
      color: 'from-teal-500 to-cyan-500',
      light: 'bg-cyan-50',
    },
    estate: {
      icon: '⚖',
      label: 'رسوم التركات',
      id: 'estate',
      color: 'from-indigo-500 to-purple-500',
      light: 'bg-purple-50',
    },
    other: {
      icon: '📁',
      label: 'باقي الوثائق',
      id: 'other',
      color: 'from-slate-500 to-gray-500',
      light: 'bg-slate-50',
    },
  },

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },

  shadows: {
    soft: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg',
    xlarge: 'shadow-xl',
    floating: 'shadow-2xl',
  },

  borderRadius: {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    xlarge: 'rounded-2xl',
    full: 'rounded-full',
  },

  transitions: {
    fast: 'transition-all duration-150',
    normal: 'transition-all duration-300',
    slow: 'transition-all duration-500',
  },

  typography: {
    heading1: 'text-4xl font-black',
    heading2: 'text-3xl font-bold',
    heading3: 'text-2xl font-bold',
    heading4: 'text-xl font-bold',
    subtitle: 'text-sm font-bold text-slate-600',
    body: 'text-base text-slate-700',
    small: 'text-sm text-slate-600',
    tiny: 'text-xs text-slate-500',
  },

  gridLayout: {
    cardsPerPage: 6,
    columns: 3, // 3 columns for 6 cards layout
    gap: 'gap-6',
  },
};

export type CategoryKey = keyof typeof designSystem.categories;
export type StatusType = 'signed' | 'pending' | 'archived';
