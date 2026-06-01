/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Apple SD Gothic Neo"', '"Malgun Gothic"', '"맑은 고딕"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        bebas: ['"Apple SD Gothic Neo"', '"Malgun Gothic"', '"맑은 고딕"', 'sans-serif'],
        noto:  ['"Apple SD Gothic Neo"', '"Malgun Gothic"', '"맑은 고딕"', 'sans-serif'],
      },
      colors: {
        wc: {
          gold:  '#C8A84B',   // 차분한 앰버 골드 (기존 #FFD700 → 채도 낮춤)
          red:   '#8B1E2F',   // 딥 크림슨 (기존 #C8102E → 더 어둡게)
          blue:  '#1B3D6E',   // 스틸 블루 (기존 #003087 → 더 차분하게)
          dark:  '#07090F',   // 딥 네이비 블랙
          card:  '#0C1220',   // 쿨 네이비 카드
        },
      },
      animation: {
        'pulse-gold':   'pulse-gold 3s ease-in-out infinite',
        'float':        'float 4s ease-in-out infinite',
        'ken-burns':    'ken-burns 8s ease-in-out infinite alternate',
        'fade-in':      'fade-in 1.2s ease forwards',
      },
      keyframes: {
        'pulse-gold': {
          '0%, 100%': { textShadow: '0 0 8px rgba(200,168,75,0.6)' },
          '50%':       { textShadow: '0 0 24px rgba(200,168,75,0.9), 0 0 48px rgba(200,168,75,0.4)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'ken-burns': {
          '0%':   { transform: 'scale(1.0) translate(0%, 0%)' },
          '100%': { transform: 'scale(1.08) translate(-1.5%, -1%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
