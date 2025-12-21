import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';

// Mock i18n
const mockChangeLanguage = vi.fn();
let mockLanguage = 'ko';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      get language() {
        return mockLanguage;
      },
      changeLanguage: mockChangeLanguage
    }
  })
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'ko';
  });

  describe('compact mode', () => {
    it('renders compact button with current language', () => {
      render(<LanguageSwitcher compact />);

      expect(screen.getByTestId('lang-switcher')).toBeInTheDocument();
      expect(screen.getByText('KR')).toBeInTheDocument();
    });

    it('toggles language when clicked', () => {
      render(<LanguageSwitcher compact />);

      fireEvent.click(screen.getByTestId('lang-switcher'));

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });

    it('has accessible label', () => {
      render(<LanguageSwitcher compact />);

      const button = screen.getByTestId('lang-switcher');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('Switch language'));
    });

    it('shows EN when English is current', () => {
      mockLanguage = 'en';
      render(<LanguageSwitcher compact />);

      expect(screen.getByText('EN')).toBeInTheDocument();
    });

    it('toggles to Korean when English is current', () => {
      mockLanguage = 'en';
      render(<LanguageSwitcher compact />);

      fireEvent.click(screen.getByTestId('lang-switcher'));

      expect(mockChangeLanguage).toHaveBeenCalledWith('ko');
    });
  });

  describe('full mode', () => {
    it('renders both language buttons', () => {
      render(<LanguageSwitcher />);

      expect(screen.getByTestId('lang-switcher-full')).toBeInTheDocument();
      expect(screen.getByTestId('lang-ko')).toBeInTheDocument();
      expect(screen.getByTestId('lang-en')).toBeInTheDocument();
    });

    it('shows Korean and English labels', () => {
      render(<LanguageSwitcher />);

      expect(screen.getByText('한국어')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('highlights current language (Korean)', () => {
      mockLanguage = 'ko';
      render(<LanguageSwitcher />);

      const koButton = screen.getByTestId('lang-ko');
      expect(koButton.className).toContain('bg-blue-600');
    });

    it('highlights current language (English)', () => {
      mockLanguage = 'en';
      render(<LanguageSwitcher />);

      const enButton = screen.getByTestId('lang-en');
      expect(enButton.className).toContain('bg-blue-600');
    });

    it('changes language to Korean when Korean button clicked', () => {
      mockLanguage = 'en';
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByTestId('lang-ko'));

      expect(mockChangeLanguage).toHaveBeenCalledWith('ko');
    });

    it('changes language to English when English button clicked', () => {
      mockLanguage = 'ko';
      render(<LanguageSwitcher />);

      fireEvent.click(screen.getByTestId('lang-en'));

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });
  });
});
