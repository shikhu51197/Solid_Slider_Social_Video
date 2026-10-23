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
    {/* 8-scalloped rosette starburst badge matching Meta / Instagram official design */}
    <path
      d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238.65 1.273 2.02 2.148 3.6 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"
      fill="#0095f6"
    />
    {/* Clean rounded checkmark */}
    <path
      d="M7.6 12.4l2.9 2.9 5.8-5.8"
      stroke="#ffffff"
      stroke-width="2.3"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
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



export const CenterPlayButton: Component<{
  size?: number;
  class?: string;
  onClick?: (e: MouseEvent) => void;
}> = (props) => (
  <button
    type="button"
    class={`uss-center-play-btn social-center-play-btn ${props.class || ''}`}
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

export const InstagramIcon: Component<{ size?: number; class?: string }> = (props) => (
  <svg
    width={props.size || 20}
    height={props.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={`social-platform-brand-icon ${props.class || ''}`}
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2" />
    <circle cx="18" cy="6" r="1.2" fill="currentColor" />
  </svg>
);

export const YouTubeIcon: Component<{ size?: number; class?: string }> = (props) => (
  <svg
    width={props.size || 20}
    height={props.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={`social-platform-brand-icon ${props.class || ''}`}
    aria-hidden="true"
  >
    <path
      d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"
      fill="#FF0000"
    />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#ffffff" />
  </svg>
);

export const FacebookIcon: Component<{ size?: number; class?: string }> = (props) => (
  <svg
    width={props.size || 20}
    height={props.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class={`social-platform-brand-icon ${props.class || ''}`}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="11" fill="#1877F2" />
    <path
      d="M14.5 12.5h-1.8v6h-2.5v-6H8.7v-2.1h1.5V8.8c0-1.5.9-2.3 2.3-2.3.7 0 1.3.1 1.5.1v1.7h-1c-.7 0-.9.4-.9.9v1.2h2l-.6 2.1z"
      fill="#ffffff"
    />
  </svg>
);


