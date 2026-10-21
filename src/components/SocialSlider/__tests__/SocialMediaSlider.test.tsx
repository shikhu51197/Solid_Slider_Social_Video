import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, waitFor } from '@solidjs/testing-library';
import { SocialMediaSlider } from '../SocialMediaSlider';
import { createSocialDataProvider } from '../../../services/socialDataProvider';

describe('SocialMediaSlider Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.open = vi.fn();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders heading "Latest from social" and initial slide from catalog', async () => {
    const provider = createSocialDataProvider('catalog');
    render(() => <SocialMediaSlider heading="Latest from social" dataProvider={provider} />);

    // Verify heading
    expect(screen.getByRole('heading', { level: 2, name: 'Latest from social' })).toBeInTheDocument();

    // Wait for content to resolve (username appears in header and caption)
    const authorElements = await screen.findAllByText('bajajfinance__moneyadda');
    expect(authorElements.length).toBeGreaterThanOrEqual(1);
  });

  it('navigates through slides using next and previous arrow buttons', async () => {
    const provider = createSocialDataProvider('catalog');
    const onSlideChange = vi.fn();

    render(() => (
      <SocialMediaSlider
        heading="Latest from social"
        dataProvider={provider}
        onSlideChange={onSlideChange}
      />
    ));

    // Wait for slide 1 to load
    await screen.findAllByText('bajajfinance__moneyadda');

    // Click Next
    const nextBtn = screen.getByLabelText('Next slide');
    fireEvent.click(nextBtn);

    // Slide 2 should be active (Facebook post by Bajaj Finance)
    const secondPost = await screen.findByText(/Gupta Ji is weighing the option/);
    expect(secondPost).toBeInTheDocument();
    expect(onSlideChange).toHaveBeenCalledWith(1, expect.objectContaining({ platform: 'facebook' }));

    // Click Prev
    const prevBtn = screen.getByLabelText('Previous slide');
    fireEvent.click(prevBtn);

    // Should return to slide 1
    const firstPost = await screen.findByText(/Paise save karne hain ya invest?/);
    expect(firstPost).toBeInTheDocument();
  });

  it('supports pagination dots click navigation', async () => {
    const provider = createSocialDataProvider('catalog');
    render(() => <SocialMediaSlider dataProvider={provider} />);

    await screen.findAllByText('bajajfinance__moneyadda');

    // Click 3rd dot (Slide 3 of 3: Money Adda on YouTube)
    const dot3 = screen.getByLabelText('Slide 3 of 3');
    fireEvent.click(dot3);

    // Should display Money Adda content
    const thirdPost = await screen.findByText(/SIP Plans for 3 Years/);
    expect(thirdPost).toBeInTheDocument();
  });

  it('supports keyboard navigation via ArrowRight and ArrowLeft', async () => {
    const provider = createSocialDataProvider('catalog');
    render(() => <SocialMediaSlider dataProvider={provider} />);

    await screen.findAllByText('bajajfinance__moneyadda');

    // Press ArrowRight
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowRight' });
    expect(await screen.findByText(/Gupta Ji is weighing the option/)).toBeInTheDocument();

    // Press ArrowLeft
    fireEvent.keyDown(screen.getByRole('region'), { key: 'ArrowLeft' });
    expect(await screen.findByText(/Paise save karne hain ya invest?/)).toBeInTheDocument();
  });

  it('renders EmptyState when data provider returns no posts', async () => {
    const emptyProvider = createSocialDataProvider('empty');
    render(() => <SocialMediaSlider dataProvider={emptyProvider} />);

    const emptyTitle = await screen.findByText('No Social Posts Available');
    expect(emptyTitle).toBeInTheDocument();
  });

  it('renders ErrorState with retry button when data provider fails', async () => {
    const errorProvider = createSocialDataProvider('error');
    render(() => <SocialMediaSlider dataProvider={errorProvider} />);

    const errorTitle = await screen.findByText('Unable to Load Social Content');
    expect(errorTitle).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('navigates to next and previous slides via touch swipe gestures', async () => {
    const provider = createSocialDataProvider('catalog');
    const { container } = render(() => <SocialMediaSlider dataProvider={provider} />);

    await screen.findAllByText('bajajfinance__moneyadda');
    const track = container.querySelector('.social-slider-track');
    expect(track).toBeInTheDocument();

    // Swipe left (swipe to next slide)
    fireEvent.touchStart(track!, { touches: [{ clientX: 250, clientY: 100 }] });
    fireEvent.touchMove(track!, { touches: [{ clientX: 150, clientY: 100 }] });
    fireEvent.touchEnd(track!);

    expect(await screen.findByText(/Gupta Ji is weighing the option/)).toBeInTheDocument();

    // Swipe right (swipe back to previous slide)
    fireEvent.touchStart(track!, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(track!, { touches: [{ clientX: 220, clientY: 100 }] });
    fireEvent.touchEnd(track!);

    expect(await screen.findByText(/Paise save karne hain ya invest?/)).toBeInTheDocument();
  });

  it('navigates to next slide via desktop mouse drag gesture', async () => {
    const provider = createSocialDataProvider('catalog');
    const { container } = render(() => <SocialMediaSlider dataProvider={provider} />);

    await screen.findAllByText('bajajfinance__moneyadda');
    const track = container.querySelector('.social-slider-track');
    expect(track).toBeInTheDocument();

    // Mouse drag left (drag next)
    fireEvent.mouseDown(track!, { button: 0, clientX: 300, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 });
    fireEvent.mouseUp(window);

    expect(await screen.findByText(/Gupta Ji is weighing the option/)).toBeInTheDocument();
  });

  it('navigates slides via horizontal wheel/trackpad scroll gestures', async () => {
    const provider = createSocialDataProvider('catalog');
    const { container } = render(() => <SocialMediaSlider dataProvider={provider} />);

    await screen.findAllByText('bajajfinance__moneyadda');
    const track = container.querySelector('.social-slider-track');
    expect(track).toBeInTheDocument();

    // Horizontal wheel scroll right (deltaX > 0)
    fireEvent.wheel(track!, { deltaX: 40, deltaY: 0 });

    expect(await screen.findByText(/Gupta Ji is weighing the option/)).toBeInTheDocument();

    // Horizontal wheel scroll left (deltaX < 0) after debounce delay
    await new Promise((resolve) => setTimeout(resolve, 450));
    fireEvent.wheel(track!, { deltaX: -40, deltaY: 0 });

    expect(await screen.findByText(/Paise save karne hain ya invest?/)).toBeInTheDocument();
  });
});

it('does not intercept host-page keys or navigate another slider instance', async () => {
  const provider = createSocialDataProvider('catalog');
  const view = render(() => <><input aria-label="Host input" /><SocialMediaSlider heading="One" storageKey="legacy-one" dataProvider={provider} /><SocialMediaSlider heading="Two" storageKey="legacy-two" dataProvider={provider} /></>);
  await screen.findAllByText('bajajfinance__moneyadda');
  const [first, second] = view.container.querySelectorAll('section');
  await waitFor(() => expect(second.querySelector('.social-card')?.textContent).toContain('bajajfinance__moneyadda'));
  fireEvent.keyDown(view.getByLabelText('Host input'), { key: 'ArrowRight' });
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(first.querySelector('.social-card')?.textContent).toContain('bajajfinance__moneyadda');
  fireEvent.keyDown(first, { key: 'ArrowRight' });
  expect(first.querySelector('.social-card')?.textContent).toContain('Bajaj Finance');
  expect(second.querySelector('.social-card')?.textContent).toContain('bajajfinance__moneyadda');
  view.unmount();
});
