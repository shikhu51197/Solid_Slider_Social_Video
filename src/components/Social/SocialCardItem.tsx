import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { SocialPost } from '../../types/social';
import type { FeedUnavailable } from './hooks/useSocialFeeds';
import { formatLikes, openSocialLink } from '../../utils/deepLink';
import {
  BookmarkIcon, CenterPlayButton, CommentIcon, HeartIcon, ShareIcon,
  VerifiedBadge, FacebookIcon, InstagramIcon, YouTubeIcon
} from './Icons';

const PLATFORM_ICONS = { instagram: InstagramIcon, youtube: YouTubeIcon, facebook: FacebookIcon };

export interface SocialCardItemProps {
  post: SocialPost;
  slideIndex: number;
  activeSlideIndex: number;
  totalSlides: number;
  onSelectDot: (index: number) => void;
  isDragging: boolean;
  unavailable?: FeedUnavailable | null;
}

export const SocialCardItem: Component<SocialCardItemProps> = (props) => {
  // Both post and profile navigation retain the slider in the same tab's history.
  const handleCardClick = () => {
    if (props.isDragging) return;
    if (props.post.postUrl) {
      openSocialLink(props.post.postUrl);
    }
  };

  const handleProfileClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.isDragging) return;
    if (props.post.account.profileUrl) {
      openSocialLink(props.post.account.profileUrl);
    }
  };

  const isVideo = () =>
    props.post.postType === 'video' ||
    props.post.postType === 'reel' ||
    props.post.postType === 'short' ||
    Boolean(props.post.videoId) ||
    (props.post.platform === 'youtube' && Boolean(props.post.postUrl));

  return (
    <div class="uss-post-layout">
      <div class="uss-card" onClick={handleCardClick} role="link" tabIndex={0}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`${props.post.account.displayName}: ${props.post.caption || props.post.title || 'View post'}`}
      >
        {/* 1. Profile Header */}
        <header class="uss-card-header">
          <a class="uss-account-meta uss-profile-link" href={props.post.account.profileUrl} onClick={(e) => { e.preventDefault(); handleProfileClick(e); }} title="View profile">
            <div class="uss-avatar-container">
              <img
                src={props.post.account.avatarUrl || '/favicon.svg'}
                alt={`${props.post.account.displayName} avatar`}
                class="uss-avatar"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  img.src = props.post.platform === 'facebook' ? '/facebook-logo.svg' : '/favicon.svg';
                }}
              />
            </div>
            <div class="uss-account-info">
              <div class="uss-username-row">
                <span class="uss-username">{props.post.account.displayName}</span>
                {/* The Figma account check is a presentation element, independent of API verification fields. */}
                <Show when={props.post.account.displayName}>
                  <VerifiedBadge size={15} />
                </Show>
              </div>
              <Show when={props.post.account.followersCount}>
                <span class="uss-followers">{props.post.account.followersCount}</span>
              </Show>
            </div>
          </a>

          <button
            type="button"
            class="uss-view-profile-btn"
            aria-label={`View ${props.post.account.displayName}'s profile`}
            onClick={handleProfileClick}
          >
            View profile
          </button>
        </header>

        {/* Media */}
        <div class="uss-media-container">
          <Show
            when={props.unavailable?.isUnavailable}
            fallback={
              <>
                <img
                  src={props.post.thumbnailUrl || '/media-placeholder.svg'}
                  alt={props.post.caption || 'Post media'}
                  class="uss-media-thumbnail cover"
                  classList={{ 'uss-media-fill': props.post.platform === 'instagram' || props.post.platform === 'facebook' }}
                  loading={props.slideIndex === props.activeSlideIndex ? 'eager' : 'lazy'}
                  fetchpriority={props.slideIndex === props.activeSlideIndex ? 'high' : 'low'}
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = '/media-placeholder.svg';
                  }}
                />

                {/* Center Play Button Overlay — plays only in respective application or browser */}
                <Show when={isVideo()}>
                  <CenterPlayButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick();
                    }}
                  />
                </Show>
              </>
            }
          >
            {/* Retry remains inside the media area so the card layout is stable. */}
            <div class="uss-unavailable-state" onClick={(e) => e.stopPropagation()}>
              <div class="uss-unavailable-icon-wrapper">
                <Dynamic component={PLATFORM_ICONS[props.post.platform]} size={34} />
              </div>
              <div class="uss-unavailable-badge">
                {props.unavailable?.badge || 'Unavailable'}
              </div>
              <div class="uss-unavailable-title">
                {props.unavailable?.title || 'Content Unavailable'}
              </div>
              <div class="uss-unavailable-desc">
                {props.unavailable?.message || 'Unable to load social content.'}
              </div>
              <button
                type="button"
                class="uss-unavailable-retry-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  props.unavailable?.onRetry?.();
                }}
              >
                <span class="uss-retry-icon">↻</span> Retry Connection
              </button>
            </div>
          </Show>

        </div>

        {/* 3. Card Footer */}
        <footer class="uss-card-footer" classList={{ 'uss-facebook-footer': props.post.platform === 'facebook' }}>
          {/* Engagement Row: Heart, Comment, Share on left, Bookmark on right */}
          <div class="uss-engagement-row">
            <div class="uss-actions-left">
              <button
                type="button"
                class="uss-icon-btn"
                aria-label="Like post"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                <HeartIcon size={20} />
              </button>
              <button
                type="button"
                class="uss-icon-btn"
                aria-label="Comment on post"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                <CommentIcon size={20} />
              </button>
              <button
                type="button"
                class="uss-icon-btn"
                aria-label="Share post"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                <ShareIcon size={20} />
              </button>
            </div>

            <button
              type="button"
              class="uss-icon-btn uss-bookmark-btn"
              aria-label="Bookmark post"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <BookmarkIcon size={20} />
            </button>
          </div>

          {/* Real Engagement Metrics (Only when returned and permitted) */}
          <div class="uss-metrics">
            <Show when={props.post.platform === 'facebook'}>
              <div class="uss-likes-count" aria-live="polite">
                {props.post.likesCount !== undefined
                  ? formatLikes(props.post.likesCount)
                  : 'Likes unavailable'}
              </div>
            </Show>
            <Show when={props.post.platform !== 'facebook'}>
              <Show when={props.post.likesCount}>
                <div class="uss-likes-count">
                  {formatLikes(props.post.likesCount!)}
                </div>
              </Show>

            </Show>
          </div>

          {/* Caption */}
          <div class="uss-caption" classList={{ 'uss-facebook-caption': props.post.platform === 'facebook' }}>
            <Show when={props.post.platform === 'facebook'} fallback={<>
              <a class="uss-caption-author uss-profile-link" href={props.post.account.profileUrl} onClick={(e) => { e.preventDefault(); handleProfileClick(e); }}>{props.post.account.displayName}</a>{' '}
              {props.post.caption || props.post.title || ''}
            </>}>
              <a class="uss-caption-author uss-profile-link" href={props.post.account.profileUrl} onClick={(e) => { e.preventDefault(); handleProfileClick(e); }}>{props.post.account.displayName}</a>{' '}
              <span>{props.post.description || props.post.caption || props.post.title || ''}</span>
            </Show>
          </div>
          {/* Horizontal Divider Line matching Reference */}
          <div class="uss-divider" />

          {/* Open the platform permalink through the shared navigation helper. */}
          <div class="uss-view-more-row">
            <Show when={props.post.postUrl}>
              <a
                href={props.post.postUrl}
                class="uss-view-more-link"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                {props.post.platform === 'youtube'
                  ? 'View more on YouTube'
                  : props.post.platform === 'facebook'
                    ? 'View more on Facebook'
                    : 'View more on instagram'}
              </a>
            </Show>
          </div>

        </footer>
      </div>
      {/* Pagination sits below the bordered post in the Figma variant. */}
      <div class="uss-dots-container" role="tablist" aria-label="Social slides pagination" onClick={(e) => e.stopPropagation()}>
        <For each={Array.from({ length: props.totalSlides }, (_, index) => index)}>
          {(idx) => (
            <button
              type="button"
              role="tab"
              aria-selected={idx === props.activeSlideIndex}
              aria-label={`Slide ${idx + 1} of ${props.totalSlides}`}
              class={`uss-dot ${idx === props.activeSlideIndex ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                props.onSelectDot(idx);
              }}
            />
          )}
        </For>
      </div>
    </div>
  );
};
