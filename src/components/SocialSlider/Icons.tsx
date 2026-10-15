import type { Component } from 'solid-js';

export const VerifiedBadge: Component<{ size?: number; class?: string }> = (props) => (
  <svg
    width={props.size || 16}
    height={props.size || 16}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={`social-verified-badge ${props.class || ''}`}
    aria-label="Verified account"
  >
    <path
      fill="#0095f6"
      d="M12.001 2.006c-1.1 0-2.1.2-3.1.6-.9-.6-2-.9-3.2-.9-2.3 0-4.3 1.6-4.9 3.8-.2.7-.6 1.4-1.2 2-1.2 1.3-1.6 3.3-1 5 .2.7.5 1.3.5 2 0 .7-.3 1.3-.5 2-.6 1.7-.2 3.7 1 5 .6.6 1 1.3 1.2 2 .6 2.2 2.6 3.8 4.9 3.8 1.2 0 2.3-.3 3.2-.9 1 .4 2 .6 3.1.6s2.1-.2 3.1-.6c.9.6 2 .9 3.2.9 2.3 0 4.3-1.6 4.9-3.8.2-.7.6-1.4 1.2-2 1.2-1.3 1.6-3.3 1-5-.2-.7-.5-1.3-.5-2 0-.7.3-1.3.5-2 .6-1.7.2-3.7-1-5-.6-.6-1-1.3-1.2-2-.6-2.2-2.6-3.8-4.9-3.8-1.2 0-2.3.3-3.2.9-1-.4-2-.6-3.1-.6z"
    />
    <path
      fill="#ffffff"
      d="M10.8 17.5l-4.5-4.5 1.5-1.5 3 3 6.8-6.8 1.5 1.5-8.3 8.3z"
    />
  </svg>
);

export const ChevronLeftIcon: Component<{ size?: number }> = (props) => (
  <svg
    width={props.size || 20}
    height={props.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export const ChevronRightIcon: Component<{ size?: number }> = (props) => (
  <svg
    width={props.size || 20}
    height={props.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

export const HeartIcon: Component<{ size?: number }> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export const CommentIcon: Component<{ size?: number }> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export const ShareIcon: Component<{ size?: number }> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const BookmarkIcon: Component<{ size?: number }> = (props) => (
  <svg
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const AlertCircleIcon: Component<{ size?: number }> = (props) => (
  <svg
    width={props.size || 48}
    height={props.size || 48}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export const InboxIcon: Component<{ size?: number }> = (props) => (
  <svg
    width={props.size || 48}
    height={props.size || 48}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export const CenterPlayButton: Component<{
  size?: number;
  onClick?: (e: MouseEvent) => void;
}> = (props) => (
  <button
    type="button"
    class="social-center-play-btn"
    aria-label="Play video"
    onClick={props.onClick}
  >
    <svg
      width={props.size || 66}
      height={props.size || 66}
      viewBox="0 0 66 66"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="social-play-icon-svg"
    >
      {/* Dark semi-opaque disc matching user's reference */}
      <circle cx="33" cy="33" r="31" fill="#151d28" fill-opacity="0.88" />
      {/* Smooth light-blue play triangle */}
      <path
        d="M26.5 22.8c0-1.4 1.53-2.28 2.75-1.57l17.2 9.93c1.22.7 1.22 2.44 0 3.14l-17.2 9.93c-1.22.7-2.75-.17-2.75-1.57V22.8z"
        fill="#38bdf8"
      />
    </svg>
  </button>
);

