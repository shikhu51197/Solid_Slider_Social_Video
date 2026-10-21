import type { Component } from 'solid-js';
import { Show } from 'solid-js';
import type { SocialPost } from '../../types/social';
import { getPlatformDeepLink, openSocialLink } from '../../utils/deepLink';
import {
  BookmarkIcon,
  CenterPlayButton,
  ChevronLeftIcon,
  ChevronRightIcon,
  CommentIcon,
  HeartIcon,
  ShareIcon,
  VerifiedBadge,
} from './Icons';
import { PaginationDots } from './PaginationDots';

export interface SocialCardProps {
  post: SocialPost;
  totalSlides: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelectIndex: (index: number) => void;
  showPlayButton?: boolean;
  allowInlinePlayback?: boolean;
  isDragging?: boolean;
}

/**
 * Maps raw platform ID to polished branding string.
 */
function getPlatformDisplayName(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'Instagram';
    case 'facebook':
      return 'Facebook';
    case 'youtube':
      return 'YouTube';
    default:
      return platform.charAt(0).toUpperCase() + platform.slice(1);
  }
}

export const SocialCard: Component<SocialCardProps> = (props) => {

  const handleCardClick = () => {
    if (props.isDragging) return;
    if (props.post.postUrl) {
      openSocialLink(props.post.postUrl, props.post.deepLinkUrl);
    }
  };

  const handleProfileClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (props.isDragging) return;
    if (props.post.account.profileUrl) {
      const appUrl = getPlatformDeepLink(props.post.platform, props.post.account.profileUrl);
      openSocialLink(props.post.account.profileUrl, appUrl);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div class="social-card-outer">
      <article
        class="social-card"
      tabIndex={0}
      role="link"
      aria-label={`Social media post by ${props.post.account.displayName}: ${props.post.caption}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      {/* 1. Profile Header */}
      <header class="social-card-header">
        <div class="social-account-meta">
          <div class="social-avatar-container">
            <img
              src={props.post.account.avatarUrl}
              alt={`${props.post.account.displayName} avatar`}
              class="social-avatar"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/bajaj-finserv-logo.png';
              }}
            />
          </div>
          <div class="social-account-info">
            <div class="social-username-row">
              <span class="social-username">{props.post.account.displayName}</span>
              <Show when={props.post.account.isVerified}>
                <VerifiedBadge size={15} />
              </Show>
            </div>
            <Show when={props.post.account.followersCount}>
              <span class="social-followers">{props.post.account.followersCount}</span>
            </Show>
          </div>
        </div>

        <button
          type="button"
          class="social-view-profile-btn"
          aria-label={`View ${props.post.account.displayName}'s profile`}
          onClick={handleProfileClick}
        >
          View profile
        </button>
      </header>

      {/* 2. Media Area with Overlaid Circular Navigation Arrows */}
      <div class={`social-media-container ratio-${props.post.aspectRatio}`}>
        <img
          src={props.post.thumbnailUrl}
          alt={props.post.caption}
          class="social-media-thumbnail cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/bajaj-instagram-reel.jpg';
          }}
        />

        {/* Center Play Button Overlay (Matching Reference Design) — plays in respective app or browser */}
        <Show when={props.showPlayButton ?? props.post.postType !== 'image'}>
          <CenterPlayButton
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          />
        </Show>

        {/* Previous Slide Arrow */}
        <button
          type="button"
          class="social-nav-arrow social-nav-prev"
          aria-label="Previous slide"
          onClick={(e) => {
            e.stopPropagation();
            props.onPrev();
          }}
        >
          <ChevronLeftIcon size={20} />
        </button>

        {/* Next Slide Arrow */}
        <button
          type="button"
          class="social-nav-arrow social-nav-next"
          aria-label="Next slide"
          onClick={(e) => {
            e.stopPropagation();
            props.onNext();
          }}
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>

      {/* 3. Engagement Row & Metadata */}
      <div class="social-card-footer">
        {/* Engagement Row */}
        <div class="social-engagement-row">
          <div class="social-actions-left">
            <button
              type="button"
              class="social-icon-btn"
              aria-label="Like post"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <HeartIcon size={24} />
            </button>
            <button
              type="button"
              class="social-icon-btn"
              aria-label="Comment on post"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <CommentIcon size={24} />
            </button>
            <button
              type="button"
              class="social-icon-btn"
              aria-label="Share post"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <ShareIcon size={24} />
            </button>
          </div>

          <button
            type="button"
            class="social-icon-btn"
            aria-label="Save post"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          >
            <BookmarkIcon size={24} />
          </button>
        </div>

        {/* Actual Likes Count & Video Metrics (Only displayed when provided; never fabricated) */}
        <div class="social-metrics-row">
          <Show when={props.post.likesCount}>
            <span class="social-likes-count">
              {props.post.likesCount} Likes
            </span>
          </Show>
          {/* <Show when={props.post.platform === 'youtube' && props.post.viewsCount}>
            <span class="social-views-count">
              {props.post.likesCount ? ' • ' : ''}{props.post.viewsCount}
            </span>
          </Show> */}
          <Show when={props.post.platform === 'youtube' && props.post.commentsCount}>
            <span class="social-comments-count">
              {(props.post.likesCount || props.post.viewsCount) ? ' • ' : ''}{props.post.commentsCount} Comments
            </span>
          </Show>
        </div>

        {/* Post Caption with Bold Username */}
        <div class="social-caption">
          <span class="social-caption-author">{props.post.account.displayName}</span>
          <span>{props.post.caption}</span>
        </div>

        {/* Subtle Horizontal Divider Line (Matching Figma Reference) */}
        <div class="social-card-divider" />

        {/* Platform Direct Link & Inline Watch Option */}
        <div class="social-view-more-row">
          <a
            href={props.post.postUrl}
            class="social-view-more-link"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
          >
            View more on {getPlatformDisplayName(props.post.platform)}
          </a>
        </div>
      </div>
    </article>

    {/* Pagination Dots placed outside the card border matching Figma design */}
    <PaginationDots
      total={props.totalSlides}
      activeIndex={props.currentIndex}
      onSelect={props.onSelectIndex}
    />
  </div>
);
};
