import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@solidjs/testing-library';
import { UnifiedSocialSlider } from '../UnifiedSocialSlider';
import type { ISocialDataProvider, SocialPost } from '../../../types/social';
import { openSocialLink } from '../../../utils/deepLink';
vi.mock('../../../utils/deepLink', async importOriginal => ({
  ...await importOriginal<typeof import('../../../utils/deepLink')>(), openSocialLink: vi.fn(),
}));

function post(platform: SocialPost['platform'], id = 'live', caption = 'Live caption'): SocialPost {
  return { id, platform, caption, postUrl: `https://www.${platform}.com/posts/${id}`,
    account: { displayName: `${platform} Author`, handle: platform, avatarUrl: '/avatar.png', profileUrl: `https://www.${platform}.com/profile/` },
    thumbnailUrl: '/photo.png', postType: 'image', aspectRatio: 'square', likesCount: '1', publishedAt: '2026-10-21' };
}
function provider(platform: SocialPost['platform']): ISocialDataProvider {
  return { getPosts: vi.fn().mockResolvedValue({ status: 'success', dataSource: 'live-api', posts: [post(platform)] }), getAccount: vi.fn() };
}
function providers() { return { instagram: provider('instagram'), youtube: provider('youtube'), facebook: provider('facebook') }; }
const selected = (root: Element) => root.querySelector('.uss-dot[aria-selected="true"]')?.getAttribute('aria-label');

beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('reusable unified slider', () => {
  it('never shows sample post data while API requests are pending', () => {
    const feeds = providers();
    for (const feed of Object.values(feeds)) vi.mocked(feed.getPosts).mockReturnValue(new Promise(() => {}));
    const view = render(() => <UnifiedSocialSlider providers={feeds} />);
    expect(Array.from(view.container.querySelectorAll('.uss-caption')).every(node => !node.textContent?.trim())).toBe(true);
    expect(view.container.querySelectorAll('.uss-view-more-link')).toHaveLength(0);
    expect(view.container.querySelectorAll('.social-verified-badge')).toHaveLength(0);
  });

  it.each(['instagram', 'youtube', 'facebook'] as const)('offers retry for %s without substituting a static post', async platform => {
    const feeds = providers();
    vi.mocked(feeds[platform].getPosts)
      .mockResolvedValueOnce({ posts: [], status: 'error', dataSource: 'none' })
      .mockResolvedValue({ posts: [post(platform, 'recovered', 'Recovered caption')], status: 'success', dataSource: 'live-api' });
    const view = render(() => <UnifiedSocialSlider providers={feeds} />);
    await waitFor(() => expect(view.getByText(`${platform === 'youtube' ? 'YouTube' : platform === 'facebook' ? 'Facebook' : 'Instagram'} Content Unavailable`)).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: /Retry Connection/ }));
    await waitFor(() => expect(view.container.textContent).toContain('Recovered caption'));
    expect(feeds[platform].getPosts).toHaveBeenLastCalledWith(true);
  });

  it('preserves post/profile click destinations and prevents duplicate anchor navigation', async () => {
    const view = render(() => <UnifiedSocialSlider providers={providers()} />);
    await waitFor(() => expect(view.container.textContent).toContain('instagram Author'));
    const card = view.container.querySelector('.uss-card')!;
    for (const selector of ['.uss-media-thumbnail', '.uss-icon-btn', '.uss-view-more-link']) {
      vi.mocked(openSocialLink).mockClear();
      fireEvent.click(card.querySelector(selector)!);
      expect(openSocialLink).toHaveBeenCalledExactlyOnceWith(post('instagram').postUrl);
    }
    vi.mocked(openSocialLink).mockClear();
    fireEvent.click(card.querySelector('.uss-view-profile-btn')!);
    expect(openSocialLink).toHaveBeenCalledExactlyOnceWith(post('instagram').account.profileUrl);
  });

  it('keeps pagination selection and thumbnail priority in sync', async () => {
    const view = render(() => <UnifiedSocialSlider providers={providers()} />);
    await waitFor(() => expect(view.container.textContent).toContain('instagram Author'));
    const images = view.container.querySelectorAll('.uss-media-thumbnail');
    expect(images[0].getAttribute('loading')).toBe('eager');
    fireEvent.click(view.container.querySelectorAll('.uss-dot')[1]);
    expect(selected(view.container)).toBe('Slide 2 of 3');
    expect(images[0].getAttribute('loading')).toBe('lazy');
    expect(images[1].getAttribute('fetchpriority')).toBe('high');
  });

  it('preserves mouse and touch swipes without opening the post while dragging', async () => {
    const view = render(() => <UnifiedSocialSlider providers={providers()} />);
    await waitFor(() => expect(view.container.textContent).toContain('instagram Author'));
    const viewport = view.container.querySelector('.uss-slider-viewport')!;
    fireEvent.mouseDown(viewport, { button: 0, clientX: 200, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 100 });
    vi.mocked(openSocialLink).mockClear();
    fireEvent.click(view.container.querySelector('.uss-card')!);
    expect(openSocialLink).not.toHaveBeenCalled();
    fireEvent.mouseUp(window);
    expect(selected(view.container)).toBe('Slide 2 of 3');
    fireEvent.touchStart(viewport, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(viewport, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(viewport);
    expect(selected(view.container)).toBe('Slide 3 of 3');
  });

  it('clears previously loaded content when a refresh explicitly reports an empty feed', async () => {
    vi.useFakeTimers();
    const feeds = providers();
    vi.mocked(feeds.instagram.getPosts)
      .mockResolvedValueOnce({ posts: [post('instagram', 'old', 'Old Instagram caption')], status: 'success', dataSource: 'live-api' })
      .mockResolvedValue({ posts: [], status: 'empty', dataSource: 'live-api' });
    const view = render(() => <UnifiedSocialSlider providers={feeds} />);
    await vi.advanceTimersByTimeAsync(0);
    expect(view.container.textContent).toContain('Old Instagram caption');
    await vi.advanceTimersByTimeAsync(300_000);
    expect(view.container.textContent).not.toContain('Old Instagram caption');
    expect(view.container.textContent).toContain('Instagram Content Unavailable');
  });

  it('renders live posts without restoring removed UI controls', async () => {
    const view = render(() => <UnifiedSocialSlider providers={providers()} />);
    await waitFor(() => expect(view.container.textContent).toContain('facebook Author'));
    expect(view.container.querySelectorAll('.uss-slide-item')).toHaveLength(3);
    expect(view.container.querySelectorAll('.social-verified-badge')).toHaveLength(3);
    expect(view.container.querySelectorAll('.uss-dot')).toHaveLength(9);
    expect(view.queryByRole('button', { name: 'Next slide' })).toBeNull();
    expect(view.queryByText('Refresh Facebook')).toBeNull();
    expect(view.container.textContent).toContain('1 Likes');
  });

  it('updates successful platforms while another request is still pending', async () => {
    const feeds = providers();
    vi.mocked(feeds.facebook.getPosts).mockReturnValue(new Promise(() => {}));
    const view = render(() => <UnifiedSocialSlider providers={feeds} />);
    await waitFor(() => expect(view.container.textContent).toContain('instagram Author'));
    expect(view.container.textContent).toContain('youtube Author');
  });

  it('keeps loaded Facebook content during temporary failure and recovers', async () => {
    vi.useFakeTimers();
    const feeds = providers();
    vi.mocked(feeds.facebook.getPosts)
      .mockResolvedValueOnce({ status: 'success', dataSource: 'live-api', posts: [post('facebook', 'old', 'Original caption')] })
      .mockResolvedValueOnce({ status: 'error', dataSource: 'none', posts: [], errorCategory: 'network_error' })
      .mockResolvedValue({ status: 'success', dataSource: 'live-api', posts: [{ ...post('facebook', 'new', 'Newest caption'), account: { ...post('facebook').account, displayName: 'Updated Author' }, likesCount: '9' }] });
    const view = render(() => <UnifiedSocialSlider providers={feeds} />);
    await vi.advanceTimersByTimeAsync(0);
    expect(view.container.textContent).toContain('Original caption');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(view.container.textContent).toContain('Original caption');
    expect(view.container.textContent).not.toContain('Facebook Content Unavailable');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(view.container.textContent).toContain('Newest caption');
    expect(view.container.textContent).toContain('Updated Author');
    expect(view.container.textContent).toContain('9 Likes');
  });

  it('isolates keyboard handling and saved state between instances and host inputs', async () => {
    const view = render(() => <><input aria-label="Host input" /><UnifiedSocialSlider title="First" storageKey="first" providers={providers()} /><UnifiedSocialSlider title="Second" storageKey="second" providers={providers()} /></>);
    const [first, second] = view.container.querySelectorAll('section');
    fireEvent.keyDown(view.getByLabelText('Host input'), { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(selected(first)).toBe('Slide 1 of 3');
    fireEvent.keyDown(first.querySelector('.uss-card')!, { key: 'ArrowRight' });
    expect(selected(first)).toBe('Slide 2 of 3');
    expect(selected(second)).toBe('Slide 1 of 3');
    expect(sessionStorage.getItem('first')).toBe('1');
    expect(sessionStorage.getItem('second')).toBeNull();
    view.unmount();
    const restored = render(() => <UnifiedSocialSlider storageKey="first" providers={providers()} />);
    expect(selected(restored.container)).toBe('Slide 2 of 3');
  });

  it('refreshes on page return and cleans up timers/listeners on unmount', async () => {
    vi.useFakeTimers();
    const feeds = providers();
    const view = render(() => <UnifiedSocialSlider providers={feeds} />);
    await vi.advanceTimersByTimeAsync(0);
    fireEvent(window, new Event('pageshow'));
    await vi.advanceTimersByTimeAsync(0);
    expect(feeds.facebook.getPosts).toHaveBeenCalledTimes(2);
    view.unmount();
    fireEvent(window, new Event('pageshow'));
    await vi.advanceTimersByTimeAsync(300_000);
    expect(feeds.facebook.getPosts).toHaveBeenCalledTimes(2);
  });
});
