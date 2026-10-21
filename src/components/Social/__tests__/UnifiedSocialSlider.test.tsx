import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@solidjs/testing-library';
import { UnifiedSocialSlider } from '../UnifiedSocialSlider';
import type { ISocialDataProvider, SocialPost } from '../../../types/social';

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
  it('renders live posts without restoring removed UI controls', async () => {
    const view = render(() => <UnifiedSocialSlider providers={providers()} />);
    await waitFor(() => expect(view.container.textContent).toContain('facebook Author'));
    expect(view.container.querySelectorAll('.uss-slide-item')).toHaveLength(3);
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
