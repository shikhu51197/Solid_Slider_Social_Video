import type { Component } from 'solid-js';
import { For, Show } from 'solid-js';
import type { MissingIntegrationDetail } from '../../types/social';
import { AlertCircleIcon, InboxIcon } from './Icons';

export const LoadingSkeleton: Component = () => (
  <div class="social-card" aria-busy="true" aria-label="Loading latest social media post">
    {/* Skeleton Header */}
    <div class="social-card-header">
      <div class="social-account-meta">
        <div class="social-avatar social-skeleton-shimmer" style={{ width: '44px', height: '44px', "border-radius": '50%' }} />
        <div class="social-account-info" style={{ gap: '6px' }}>
          <div class="social-skeleton-shimmer" style={{ width: '120px', height: '14px', "border-radius": '4px' }} />
          <div class="social-skeleton-shimmer" style={{ width: '80px', height: '11px', "border-radius": '4px' }} />
        </div>
      </div>
      <div class="social-skeleton-shimmer" style={{ width: '90px', height: '32px', "border-radius": '8px' }} />
    </div>

    {/* Skeleton Media */}
    <div class="social-media-container social-skeleton-shimmer" />

    {/* Skeleton Footer */}
    <div class="social-card-footer" style={{ gap: '12px' }}>
      <div class="social-skeleton-shimmer" style={{ width: '140px', height: '22px', "border-radius": '4px' }} />
      <div class="social-skeleton-shimmer" style={{ width: '90px', height: '14px', "border-radius": '4px' }} />
      <div class="social-skeleton-shimmer" style={{ width: '100%', height: '34px', "border-radius": '4px' }} />
      <div class="social-skeleton-shimmer" style={{ width: '150px', height: '16px', "border-radius": '4px' }} />
    </div>
  </div>
);

export const EmptyState: Component<{ onRetry?: () => void }> = (props) => (
  <div class="social-card">
    <div class="social-state-container">
      <InboxIcon size={44} />
      <div class="social-state-title">No Social Posts Available</div>
      <div class="social-state-desc">
        There are currently no active authorized posts to display from the social channels.
      </div>
      {props.onRetry && (
        <button type="button" class="social-retry-btn" onClick={props.onRetry}>
          Refresh Posts
        </button>
      )}
    </div>
  </div>
);

export interface ErrorStateProps {
  message?: string;
  missingIntegrations?: MissingIntegrationDetail[];
  onRetry: () => void;
}

export const ErrorState: Component<ErrorStateProps> = (props) => (
  <div class="social-card">
    <div class="social-state-container">
      <AlertCircleIcon size={44} />
      <div class="social-state-title">Unable to Load Social Content</div>
      <div class="social-state-desc">
        {props.message || 'An error occurred while fetching updates from the social media provider.'}
      </div>

      <Show when={props.missingIntegrations && props.missingIntegrations.length > 0}>
        <div class="social-missing-integration-box">
          <div class="social-missing-title">Missing Authorized API Configurations:</div>
          <For each={props.missingIntegrations}>
            {(item) => (
              <div class="social-missing-item">
                <span class="social-missing-platform">{item.platform.toUpperCase()}:</span>
                <code>{item.missingConfigs.join(', ')}</code>
                <a
                  href={item.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="social-missing-link"
                >
                  Setup Docs &rarr;
                </a>
              </div>
            )}
          </For>
        </div>
      </Show>

      <button type="button" class="social-retry-btn" onClick={props.onRetry}>
        Try Again
      </button>
    </div>
  </div>
);
