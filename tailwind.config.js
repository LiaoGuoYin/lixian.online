/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/shared/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        'apple': '12px',
        'apple-sm': '8px',
        'apple-lg': '16px',
        'apple-xl': '20px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'system-ui',
          'sans-serif'
        ]
      },
      fontSize: {
        'display': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
        'headline': ['clamp(2rem, 5vw, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        'title': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'body': ['1rem', { lineHeight: '1.5' }],
        'caption': ['0.875rem', { lineHeight: '1.4' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      colors: {
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        card: {
          DEFAULT: 'rgb(var(--card))',
          foreground: 'rgb(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'rgb(var(--popover))',
          foreground: 'rgb(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'rgb(var(--primary))',
          foreground: 'rgb(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary))',
          foreground: 'rgb(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'rgb(var(--muted))',
          foreground: 'rgb(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'rgb(var(--accent))',
          foreground: 'rgb(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive))',
          foreground: 'rgb(var(--destructive-foreground))'
        },
        border: 'rgb(var(--border))',
        input: 'rgb(var(--input))',
        ring: 'rgb(var(--ring))',
        chart: {
          '1': 'rgb(var(--chart-1))',
          '2': 'rgb(var(--chart-2))',
          '3': 'rgb(var(--chart-3))',
          '4': 'rgb(var(--chart-4))',
          '5': 'rgb(var(--chart-5))'
        },
        apple: {
          gray: {
            1: 'rgb(var(--apple-gray-1))',
            2: 'rgb(var(--apple-gray-2))',
            3: 'rgb(var(--apple-gray-3))',
            4: 'rgb(var(--apple-gray-4))',
            5: 'rgb(var(--apple-gray-5))',
            6: 'rgb(var(--apple-gray-6))',
          }
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      boxShadow: {
        'apple': '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 6px rgba(0, 0, 0, 0.04)',
        'apple-lg': '0 12px 48px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04)',
        'apple-button': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'apple-button-pressed': 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} 