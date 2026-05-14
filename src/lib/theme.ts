import { createTheme } from '@mantine/core'

export const mantineTheme = createTheme({
  fontFamily:
    "'Geist Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyMonospace: "'Geist Mono Variable', monospace",
  defaultRadius: 0,
  primaryColor: 'green',
  black: '#1C1917',
  colors: {
    green: [
      '#f0fdf4',
      '#dcfce7',
      '#bbf7d0',
      '#86efac',
      '#4ade80',
      '#10B981',
      '#00DC82',
      '#059669',
      '#047857',
      '#065f46',
    ],
  },
  components: {
    Button: {
      defaultProps: { radius: '1.2px', fw: 500 },
    },
    TextInput: { defaultProps: { radius: 0 } },
    Textarea: { defaultProps: { radius: 0 } },
    Anchor: {
      defaultProps: {
        underline: 'never',
      },
    },
  },
})
