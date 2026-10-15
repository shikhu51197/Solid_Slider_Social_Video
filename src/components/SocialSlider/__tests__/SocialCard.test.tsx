import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@solidjs/testing-library';
import { SocialCard } from '../SocialCard';
import type { SocialPost } from '../../../types/social';

const mockPost: SocialPost = {
  id: 'test-ig-1',
  platform: 'instagram',
  account: {
    handle: 'bajajfinance__emihaina',
    displayName: 'bajajfinance__emihaina',
    profileUrl: 'https://www.instagram.com/bajajfinance__moneyadda/',
    avatarUrl: '/bajaj-finserv-logo.png',
    followersCount: '2.2M Followers',
    isVerified: true,
  },
  caption: "Slice through your worries with easy EMI's! 🍋 Fresh deals await.",
  thumbnailUrl: '/bajaj-emi-instagram.jpg',
  postUrl: 'https://www.instagram.com/p/DeexDdAjtRN/',
  likesCount: '4,447',
  postType: 'image',
  aspectRatio: 'square',
};

describe('SocialCard Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.open = vi.fn();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all post elements correctly: avatar, username, badge, followers, likes, caption', () => {
    render(() => (
      <SocialCard
        post={mockPost}
        totalSlides={3}
        currentIndex={0}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSelectIndex={vi.fn()}
      />
    ));

    // Username appears in both header and caption author prefix
    const usernameElements = screen.getAllByText('bajajfinance__emihaina');
    expect(usernameElements.length).toBe(2);
    expect(screen.getByText('2.2M Followers')).toBeInTheDocument();

    // Verified badge
    expect(screen.getByLabelText('Verified account')).toBeInTheDocument();

    // View profile button
    expect(screen.getByRole('button', { name: "View bajajfinance__emihaina's profile" })).toBeInTheDocument();

    // Thumbnail
    const thumbnail = screen.getByAltText(mockPost.caption);
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', '/bajaj-emi-instagram.jpg');

    // Likes
    expect(screen.getByText('4,447 Likes')).toBeInTheDocument();

    // Caption
    expect(screen.getByText(/Slice through your worries/)).toBeInTheDocument();

    // View more link
    const viewMoreLink = screen.getByText('View more on Instagram');
    expect(viewMoreLink).toBeInTheDocument();
    expect(viewMoreLink).toHaveAttribute('href', mockPost.postUrl);
  });

  it('handles missing metrics gracefully without fabricating follower count or likes', () => {
    const postWithoutMetrics: SocialPost = {
      ...mockPost,
      likesCount: undefined,
      account: {
        ...mockPost.account,
        followersCount: undefined,
        isVerified: false,
      },
    };

    render(() => (
      <SocialCard
        post={postWithoutMetrics}
        totalSlides={3}
        currentIndex={0}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSelectIndex={vi.fn()}
      />
    ));

    // Follower count and likes count must not be present
    expect(screen.queryByText(/Followers/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Likes/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Verified account')).not.toBeInTheDocument();
  });

  it('redirects to profile URL on same page when "View profile" button is clicked', () => {
    render(() => (
      <SocialCard
        post={mockPost}
        totalSlides={3}
        currentIndex={0}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSelectIndex={vi.fn()}
      />
    ));

    const viewProfileBtn = screen.getByRole('button', { name: "View bajajfinance__emihaina's profile" });
    fireEvent.click(viewProfileBtn);

    expect(window.open).toHaveBeenCalledWith('https://www.instagram.com/bajajfinance__moneyadda/', '_self', undefined);
  });

  it('redirects to post URL on same page when post card is clicked', () => {
    render(() => (
      <SocialCard
        post={mockPost}
        totalSlides={3}
        currentIndex={0}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSelectIndex={vi.fn()}
      />
    ));

    const card = screen.getByRole('link', { name: new RegExp(mockPost.caption) });
    fireEvent.click(card);

    expect(window.open).toHaveBeenCalledWith('https://www.instagram.com/p/DeexDdAjtRN/', '_self', undefined);
  });

  it('triggers onPrev and onNext when circular navigation arrows are clicked', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();

    render(() => (
      <SocialCard
        post={mockPost}
        totalSlides={3}
        currentIndex={0}
        onPrev={onPrev}
        onNext={onNext}
        onSelectIndex={vi.fn()}
      />
    ));

    const prevBtn = screen.getByLabelText('Previous slide');
    const nextBtn = screen.getByLabelText('Next slide');

    fireEvent.click(prevBtn);
    expect(onPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('adapts platform link for Facebook and YouTube correctly', () => {
    const fbPost: SocialPost = { ...mockPost, platform: 'facebook' };
    const { unmount } = render(() => (
      <SocialCard
        post={fbPost}
        totalSlides={3}
        currentIndex={1}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSelectIndex={vi.fn()}
      />
    ));
    expect(screen.getByText('View more on Facebook')).toBeInTheDocument();
    unmount();

    const ytPost: SocialPost = { ...mockPost, platform: 'youtube' };
    render(() => (
      <SocialCard
        post={ytPost}
        totalSlides={3}
        currentIndex={2}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSelectIndex={vi.fn()}
      />
    ));
    expect(screen.getByText('View more on YouTube')).toBeInTheDocument();
  });

  it('renders prominent center play button for video/reel posts and triggers post link on click', () => {
    const videoPost: SocialPost = {
      ...mockPost,
      postType: 'reel',
    };

    render(() => (
      <SocialCard
        post={videoPost}
        totalSlides={3}
        currentIndex={0}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSelectIndex={vi.fn()}
      />
    ));

    const playBtn = screen.getByLabelText('Play video');
    expect(playBtn).toBeInTheDocument();

    fireEvent.click(playBtn);
    expect(window.open).toHaveBeenCalledWith(videoPost.postUrl, '_self', undefined);
  });

  it('hides center play button for pure image posts', () => {
    const imagePost: SocialPost = {
      ...mockPost,
      postType: 'image',
    };

    render(() => (
      <SocialCard
        post={imagePost}
        totalSlides={3}
        currentIndex={0}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onSelectIndex={vi.fn()}
      />
    ));

    expect(screen.queryByLabelText('Play video')).not.toBeInTheDocument();
  });
});
