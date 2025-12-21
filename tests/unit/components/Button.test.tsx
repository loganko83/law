import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Button } from '../../../components/Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies primary variant by default', () => {
    render(<Button testId="btn">Primary</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('bg-blue-600');
  });

  it('applies secondary variant', () => {
    render(<Button variant="secondary" testId="btn">Secondary</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('bg-slate-800');
  });

  it('applies outline variant', () => {
    render(<Button variant="outline" testId="btn">Outline</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('border-2');
  });

  it('applies ghost variant', () => {
    render(<Button variant="ghost" testId="btn">Ghost</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('bg-transparent');
  });

  it('applies medium size by default', () => {
    render(<Button testId="btn">Medium</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('px-4 py-3');
  });

  it('applies small size', () => {
    render(<Button size="sm" testId="btn">Small</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('px-3 py-2');
  });

  it('applies large size', () => {
    render(<Button size="lg" testId="btn">Large</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('px-6 py-4');
  });

  it('applies full width when specified', () => {
    render(<Button fullWidth testId="btn">Full Width</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('w-full');
  });

  it('accepts custom className', () => {
    render(<Button className="custom-class" testId="btn">Custom</Button>);
    const button = screen.getByTestId('btn');
    expect(button.className).toContain('custom-class');
  });

  it('can be disabled', () => {
    render(<Button disabled testId="btn">Disabled</Button>);
    const button = screen.getByTestId('btn');
    expect(button).toBeDisabled();
  });

  it('passes through HTML button attributes', () => {
    render(<Button type="submit" testId="btn">Submit</Button>);
    const button = screen.getByTestId('btn');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
