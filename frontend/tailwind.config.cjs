module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Arabic"', 'ui-sans-serif', 'system-ui'],
        amiri: ['Amiri', 'serif'],
      },
    },
  },
  plugins: [],
  rtl: true,
};
