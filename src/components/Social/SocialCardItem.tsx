import { showAccountBadge } from '../../config/social';
import { UI_TEXT } from '../../config/uiText';
import { formatFollowers } from '../../utils/formatFollowers';
import type { Component } from 'solid-js';
import { createEffect, createSignal, createUniqueId, onCleanup, onMount, For, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { SocialPost } from '../../types/social';
import type { FeedUnavailable } from './hooks/useSocialFeeds';
import { formatLikes, openSocialLink } from '../../utils/deepLink';
import {
  ThumbUpIcon, ThumbDownIcon, ForwardShareIcon,
  BookmarkIcon, /* CenterPlayButton, */ CommentIcon, HeartIcon, ShareIcon,
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
  const [captionExpanded, setCaptionExpanded] = createSignal(false);
  const [captionOverflows, setCaptionOverflows] = createSignal(false);
  const captionId = createUniqueId();
  let captionElement!: HTMLDivElement;
  const measureCaption = () => {
    if (!captionExpanded()) setCaptionOverflows(captionElement.scrollHeight > captionElement.clientHeight + 1);
  };
  createEffect(() => {
    // Reset expanded state when polling replaces the post or its description.
    void props.post.id;
    void props.post.caption;
    void props.post.description;
    setCaptionExpanded(false);
    queueMicrotask(measureCaption);
  });
  onMount(() => {
    const observer = new ResizeObserver(measureCaption);
    observer.observe(captionElement);
    onCleanup(() => observer.disconnect());
  });

  const isUnavailable = () => Boolean(props.unavailable?.isUnavailable);

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

  /* Play overlay disabled.
  const isVideo = () =>
    props.post.postType === 'video' ||
    props.post.postType === 'reel' ||
    props.post.postType === 'short' ||
    Boolean(props.post.videoId) ||
    (props.post.platform === 'youtube' && Boolean(props.post.postUrl));
  */

  return (
    <div class="uss-post-layout">
      <div class="uss-card" onClick={handleCardClick} role="link" tabIndex={0}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleCardClick();
          }
        }}
        aria-label={`${props.post.account.displayName}: ${props.post.caption || props.post.title || UI_TEXT.viewPost}`}
      >
        {/* 1. Profile Header */}
        <header class="uss-card-header">
          <a class="uss-account-meta uss-profile-link" href={props.post.account.profileUrl} onClick={(e) => { e.preventDefault(); handleProfileClick(e); }} title={UI_TEXT.viewProfile}>
            <div class="uss-avatar-container">
              <img
                src={props.post.account.avatarUrl || '/favicon.svg'}
                alt={UI_TEXT.avatarLabel(props.post.account.displayName)}
                class="uss-avatar"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  img.src = props.post.platform === 'facebook' && !isUnavailable() ? '/facebook-logo.svg' : '/favicon.svg';
                }}
              />
            </div>
            <div class="uss-account-info">
              <div class="uss-username-row">
                <span class="uss-username">{props.post.account.displayName}</span>
                <Show when={showAccountBadge(props.post.platform, props.post.account)}>
                  <VerifiedBadge size={15} />
                </Show>
              </div>
              <Show when={formatFollowers(props.post.account.followersCount, props.post.platform)}>
                <span class="uss-followers">{formatFollowers(props.post.account.followersCount, props.post.platform)}</span>
              </Show>
            </div>
          </a>

          <button
            type="button"
            class="uss-view-profile-btn"
            aria-label={UI_TEXT.profileLabel(props.post.account.displayName)}
            disabled={!props.post.account.profileUrl}
            onClick={handleProfileClick}
          >
            {UI_TEXT.viewProfile}
          </button>
        </header>

        {/* Media */}
        <div class="uss-media-container">
          <Show
            when={isUnavailable()}
            fallback={
              <>
                <img
                  src={props.post.thumbnailUrl || '/media-placeholder.svg'}
                  alt={props.post.caption || UI_TEXT.postMedia}
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

                {/* Play overlay disabled.
                <Show when={isVideo()}>
                  <CenterPlayButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick();
                    }}
                  />
                </Show>
                */}
              </>
            }
          >
            {/* Retry remains inside the media area so the card layout is stable. */}
            <div class="uss-unavailable-state" role="status" aria-live="polite" aria-busy={props.unavailable?.isRetrying || false} onClick={(e) => e.stopPropagation()}>
              <div class="uss-unavailable-icon-wrapper">
                <Dynamic component={PLATFORM_ICONS[props.post.platform]} size={34} />
              </div>
              <div class="uss-unavailable-badge">
                {props.unavailable?.badge || UI_TEXT.unavailable}
              </div>
              <div class="uss-unavailable-title">
                {props.unavailable?.title || UI_TEXT.unavailableTitle}
              </div>
              <div class="uss-unavailable-desc">
                {props.unavailable?.message || UI_TEXT.unavailableMessage}
              </div>
              <button
                type="button"
                class="uss-unavailable-retry-btn"
                disabled={props.unavailable?.isRetrying}
                onClick={(e) => {
                  e.stopPropagation();
                  props.unavailable?.onRetry?.();
                }}
              >
                <span class="uss-retry-icon" aria-hidden="true">↻</span> {props.unavailable?.isRetrying ? UI_TEXT.retrying : UI_TEXT.retry}
              </button>
            </div>
          </Show>

        </div>

        {/* 3. Card Footer */}
        <footer class="uss-card-footer" classList={{ 'uss-facebook-footer': props.post.platform === 'facebook' && !isUnavailable() }}>
          {/* Engagement Row: Heart, Comment, Share on left, Bookmark on right */}
          <div class="uss-engagement-row">
            <div class="uss-actions-left">
              <button
                type="button"
                class="uss-icon-btn"
                aria-label={UI_TEXT.likePost}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                <Show when={props.post.platform === 'instagram'} fallback={<ThumbUpIcon size={20} />}><HeartIcon size={20} /></Show>
              </button>
              <button
                type="button"
                class="uss-icon-btn"
                aria-label={props.post.platform === 'youtube' ? UI_TEXT.dislikePost : UI_TEXT.commentPost}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                <Show when={props.post.platform === 'youtube'} fallback={<CommentIcon size={20} />}><ThumbDownIcon size={20} /></Show>
              </button>
              <button
                type="button"
                class="uss-icon-btn"
                aria-label={UI_TEXT.sharePost}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
              >
                <Show when={props.post.platform === 'instagram'} fallback={<ForwardShareIcon size={20} />}><ShareIcon size={20} /></Show>
              </button>
            </div>

            <button
              type="button"
              class="uss-icon-btn uss-bookmark-btn"
              aria-label={UI_TEXT.bookmarkPost}
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
            <Show when={props.post.platform === 'facebook' && !isUnavailable()}>
              <div class="uss-likes-count" aria-live="polite">
                {props.post.likesCount !== undefined
                  ? formatLikes(props.post.likesCount)
                  : UI_TEXT.likesUnavailable}
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
          <div class="uss-caption-section" classList={{ 'uss-caption-section-expanded': captionExpanded(), 'uss-caption-section-truncated': captionOverflows() && !captionExpanded(), 'uss-caption-section-compact': true }}>
          <div ref={captionElement} id={captionId} class="uss-caption" classList={{ 'uss-caption-expanded': captionExpanded(), 'uss-facebook-caption': props.post.platform === 'facebook' && !isUnavailable() }}>
            <Show when={props.post.platform === 'instagram'}>
              <a class="uss-caption-author uss-profile-link" href={props.post.account.profileUrl} onClick={(e) => { e.preventDefault(); handleProfileClick(e); }}>{props.post.account.displayName}</a>{' '}
            </Show>
            <span>{props.post.platform === 'facebook' || props.post.platform === 'youtube'
              ? props.post.description || props.post.caption || props.post.title || ''
              : props.post.caption || props.post.title || ''}</span>
          </div>
          <Show when={captionOverflows()}>
            <button type="button" class="uss-caption-toggle" aria-expanded={captionExpanded()} aria-controls={captionId}
              onClick={(event) => {
                event.stopPropagation();
                setCaptionExpanded(expanded => !expanded);
              }}>
              {captionExpanded() ? UI_TEXT.seeLess : UI_TEXT.seeMore}
            </button>
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
                {UI_TEXT.viewMore[props.post.platform]}
              </a>
            </Show>
          </div>

        </footer>
      </div>
      {/* Pagination sits below the bordered post in the Figma variant. */}
      <div class="uss-dots-container" role="tablist" aria-label={UI_TEXT.pagination} onClick={(e) => e.stopPropagation()}>
        <For each={Array.from({ length: props.totalSlides }, (_, index) => index)}>
          {(idx) => (
            <button
              type="button"
              role="tab"
              aria-selected={idx === props.activeSlideIndex}
              aria-label={UI_TEXT.slideLabel(idx + 1, props.totalSlides)}
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
