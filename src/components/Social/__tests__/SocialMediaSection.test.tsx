import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@solidjs/testing-library';
import { SocialMediaSection } from '../SocialMediaSection';

describe('SocialMediaSection Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.open = vi.fn();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders section title "Discover on Social" and subtitle', () => {
    render(() => <SocialMediaSection />);

    expect(screen.getByRole('heading', { level: 1, name: 'Discover on Social' })).toBeInTheDocument();
    expect(
      screen.getByText(/Explore the latest videos, posts, and product inspiration/)
    ).toBeInTheDocument();
  });

  it('renders all 3 sliders in exact order: 1. Instagram, 2. YouTube, 3. Facebook', () => {
    const { container } = render(() => <SocialMediaSection />);

    // Check slider container blocks in DOM order
    const blocks = container.querySelectorAll('.platform-slider-block');
    expect(blocks.length).toBe(3);

    expect(blocks[0]).toHaveClass('instagram-block');
    expect(blocks[1]).toHaveClass('youtube-block');
    expect(blocks[2]).toHaveClass('facebook-block');

    expect(screen.getByText('Latest from Instagram')).toBeInTheDocument();
    expect(screen.getByText('Featured on YouTube')).toBeInTheDocument();
    expect(screen.getByText('Updates from Facebook')).toBeInTheDocument();
  });

  it('provides platform profile and channel links', () => {
    render(() => <SocialMediaSection />);

    const igLink = screen.getByText('View Instagram Profile').closest('a');
    expect(igLink).toHaveAttribute('href', 'https://www.instagram.com/hey_learningstar/');

    const ytLink = screen.getByText('Visit YouTube Channel').closest('a');
    expect(ytLink).toHaveAttribute('href', 'https://www.youtube.com/@bajaj_finance_limited');

    const fbLink = screen.getByText('Follow on Facebook').closest('a');
    expect(fbLink).toHaveAttribute('href', 'https://www.facebook.com/bajaj.finance.in/');
  });

  it('filters to single platform view when platform pill is clicked', () => {
    const { container } = render(() => <SocialMediaSection />);

    // Click on Instagram pill
    const igPill = screen.getByRole('button', { name: /1\. Instagram/ });
    fireEvent.click(igPill);

    const blocks = container.querySelectorAll('.platform-slider-block');
    expect(blocks.length).toBe(1);
    expect(blocks[0]).toHaveClass('instagram-block');

    // Click on All Platforms pill to restore
    const allPill = screen.getByRole('button', { name: /All Platforms/ });
    fireEvent.click(allPill);

    expect(container.querySelectorAll('.platform-slider-block').length).toBe(3);
  });
});
