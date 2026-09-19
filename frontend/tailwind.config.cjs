module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Arabic"', 'ui-sans-serif', 'system-ui'],
        amiri: ['Amiri', 'serif'],
        maghribi: ['Maghribi', 'Amiri', 'Tajawal', 'serif'],
        kufi: ['DroidArabicKufi', 'Roboto', 'Noto Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [],
  rtl: true,
};
