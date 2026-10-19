import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';
import { SocialMediaSlider } from '../SocialSlider/SocialMediaSlider';
import {
  InstagramLiveDataProvider,
  YouTubeLiveDataProvider,
  FacebookLiveDataProvider,
} from '../../services/socialDataProvider';
import { InstagramIcon, YouTubeIcon, FacebookIcon } from '../SocialSlider/Icons';
import './SocialMediaSection.css';

export interface SocialMediaSectionProps {
  title?: string;
  subtitle?: string;
  class?: string;
  defaultLayout?: 'stacked' | 'tabs';
}

export const SocialMediaSection: Component<SocialMediaSectionProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<'all' | 'instagram' | 'youtube' | 'facebook'>('all');

  const instagramProvider = new InstagramLiveDataProvider('/api/social/instagram', 300);
  const youtubeProvider = new YouTubeLiveDataProvider('@bajaj_finance_limited');
  const facebookProvider = new FacebookLiveDataProvider('/api/social/facebook', 300);

  return (
    <section class={`live-commerce-section ${props.class || ''}`} aria-label="Social Media Commerce Showcase">
      {/* 1. Section Header: Discover on Social */}
      <header class="section-hero-header">
        <div class="section-title-wrap">
          <div class="section-live-badge">
            <span class="live-pulse-dot" />
            <span>LIVE COMMERCE SOCIAL FEEDS</span>
          </div>
          <h1 class="section-main-heading">{props.title || 'Discover on Social'}</h1>
          <p class="section-sub-heading">
            {props.subtitle || 'Explore the latest videos, posts, and product inspiration from our social channels.'}
          </p>
        </div>

        {/* Platform Quick Filter Pills */}
        <nav class="platform-filter-nav" aria-label="Platform Feed Switcher">
          <button
            type="button"
            class={`platform-filter-pill ${activeTab() === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All Platforms (3 Sliders)</span>
          </button>

          <button
            type="button"
            class={`platform-filter-pill ${activeTab() === 'instagram' ? 'active' : ''}`}
            onClick={() => setActiveTab('instagram')}
          >
            <InstagramIcon size={16} />
            <span>1. Instagram</span>
            <span class="filter-count-badge">API Live</span>
          </button>

          <button
            type="button"
            class={`platform-filter-pill ${activeTab() === 'youtube' ? 'active' : ''}`}
            onClick={() => setActiveTab('youtube')}
          >
            <YouTubeIcon size={16} />
            <span>2. YouTube</span>
            <span class="filter-count-badge">API Live</span>
          </button>

          <button
            type="button"
            class={`platform-filter-pill ${activeTab() === 'facebook' ? 'active' : ''}`}
            onClick={() => setActiveTab('facebook')}
          >
            <FacebookIcon size={16} />
            <span>3. Facebook</span>
            <span class="filter-count-badge">Page API</span>
          </button>
        </nav>
      </header>

      {/* 2. Three Sliders in Exact Required Order: 1. Instagram, 2. YouTube, 3. Facebook */}
      <div class="sliders-stream-container">
        {/* SLIDER 1: INSTAGRAM (Connected Creator Account @hey_learningstar) */}
        {(activeTab() === 'all' || activeTab() === 'instagram') && (
          <div class="platform-slider-block instagram-block" id="slider-instagram">
            <div class="platform-slider-header">
              <div class="platform-header-left">
                <span class="platform-brand-badge ig-badge">
                  <InstagramIcon size={18} />
                </span>
                <div>
                  <h2 class="platform-slider-title">Latest from Instagram</h2>
                  <p class="platform-slider-subtitle">
                    Connected Creator: <strong>@hey_learningstar</strong> (The_Great_life) • Real Graph API v26.0
                  </p>
                </div>
              </div>
              <a
                href="https://www.instagram.com/hey_learningstar/"
                target="_blank"
                rel="noopener noreferrer"
                class="platform-view-all-link"
              >
                <span>View Instagram Profile</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <SocialMediaSlider
              heading="Instagram Stream"
              dataProvider={instagramProvider}
              allowInlinePlayback={true}
              class="instagram-slider-custom"
            />
          </div>
        )}

        {/* SLIDER 2: YOUTUBE (Official Channel @bajaj_finance_limited) */}
        {(activeTab() === 'all' || activeTab() === 'youtube') && (
          <div class="platform-slider-block youtube-block" id="slider-youtube">
            <div class="platform-slider-header">
              <div class="platform-header-left">
                <span class="platform-brand-badge yt-badge">
                  <YouTubeIcon size={18} />
                </span>
                <div>
                  <h2 class="platform-slider-title">Featured on YouTube</h2>
                  <p class="platform-slider-subtitle">
                    Official Channel: <strong>@bajaj_finance_limited</strong> • Real YouTube Data API v3
                  </p>
                </div>
              </div>
              <a
                href="https://www.youtube.com/@bajaj_finance_limited"
                target="_blank"
                rel="noopener noreferrer"
                class="platform-view-all-link"
              >
                <span>Visit YouTube Channel</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <SocialMediaSlider
              heading="YouTube Videos"
              dataProvider={youtubeProvider}
              allowInlinePlayback={true}
              class="youtube-slider-custom"
            />
          </div>
        )}

        {/* SLIDER 3: FACEBOOK (Official Page Posts & Videos) */}
        {(activeTab() === 'all' || activeTab() === 'facebook') && (
          <div class="platform-slider-block facebook-block" id="slider-facebook">
            <div class="platform-slider-header">
              <div class="platform-header-left">
                <span class="platform-brand-badge fb-badge">
                  <FacebookIcon size={18} />
                </span>
                <div>
                  <h2 class="platform-slider-title">Updates from Facebook</h2>
                  <p class="platform-slider-subtitle">
                    Official Page: <strong>Bajaj Finance</strong> • Graph API v26.0 Feed Integration
                  </p>
                </div>
              </div>
              <a
                href="https://www.facebook.com/bajaj.finance.in/"
                target="_blank"
                rel="noopener noreferrer"
                class="platform-view-all-link"
              >
                <span>Follow on Facebook</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>

            <SocialMediaSlider
              heading="Facebook Updates"
              dataProvider={facebookProvider}
              allowInlinePlayback={true}
              class="facebook-slider-custom"
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default SocialMediaSection;
