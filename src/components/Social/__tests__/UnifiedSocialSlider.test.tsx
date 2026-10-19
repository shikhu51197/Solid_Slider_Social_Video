import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@solidjs/testing-library';
import { UnifiedSocialSlider } from '../UnifiedSocialSlider';

describe('UnifiedSocialSlider Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.open = vi.fn();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders section title "Latest from social"', () => {
    render(() => <UnifiedSocialSlider />);

    expect(screen.getByRole('heading', { level: 2, name: 'Latest from social' })).toBeInTheDocument();
  });

  it('renders single slider with 3 slides in the strip', () => {
    const { container } = render(() => <UnifiedSocialSlider />);

    // 3 slide items in the strip
    const slideItems = container.querySelectorAll('.uss-slide-item');
    expect(slideItems.length).toBe(3);

    // Initial slide is Instagram post matching reference
    expect(screen.getAllByText('bajajfinance__moneyadda').length).toBeGreaterThan(0);
    expect(screen.getByText('621K Followers')).toBeInTheDocument();
    expect(screen.getByText('4,447 Likes')).toBeInTheDocument();
    expect(screen.getByText('View more on Instagram')).toBeInTheDocument();

    // 3 pagination dots (. . .) inside the slide card
    const firstSlide = container.querySelectorAll('.uss-slide-item')[0];
    const dots = firstSlide.querySelectorAll('.uss-dot');
    expect(dots.length).toBe(3);
    expect(dots[0]).toHaveClass('active');
  });

  it('provides overlaid next and previous arrow buttons that navigate slides', () => {
    const { container } = render(() => <UnifiedSocialSlider />);

    const nextButtons = screen.getAllByRole('button', { name: 'Next slide' });
    expect(nextButtons.length).toBeGreaterThan(0);

    // Click next slide button
    fireEvent.click(nextButtons[0]);

    // Slide 2 is now active
    const dots = container.querySelectorAll('.uss-dot');
    expect(dots[1]).toHaveClass('active');

    // Click previous slide button
    const prevButtons = screen.getAllByRole('button', { name: 'Previous slide' });
    fireEvent.click(prevButtons[0]);
    expect(dots[0]).toHaveClass('active');
  });

  it('switches slides when pagination dots are clicked', () => {
    const { container } = render(() => <UnifiedSocialSlider />);

    const dots = container.querySelectorAll('.uss-dot');
    expect(dots[0]).toHaveClass('active');

    // Click dot 2 (YouTube)
    fireEvent.click(dots[1]);
    expect(dots[1]).toHaveClass('active');

    // Click dot 3 (Facebook)
    fireEvent.click(dots[2]);
    expect(dots[2]).toHaveClass('active');
  });

  it('has Live Refresh button to trigger real-time updates', () => {
    render(() => <UnifiedSocialSlider />);

    const refreshBtn = screen.getByRole('button', { name: /Refresh live feeds/i });
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);
    expect(refreshBtn).toBeInTheDocument();
  });
});
