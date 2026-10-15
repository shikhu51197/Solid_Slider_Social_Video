import type { Component } from 'solid-js';
import { For } from 'solid-js';

export interface PaginationDotsProps {
  total: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}

export const PaginationDots: Component<PaginationDotsProps> = (props) => {
  return (
    <div
      class="social-dots-container"
      role="tablist"
      aria-label="Slide pagination"
      onClick={(e) => e.stopPropagation()}
    >
      <For each={Array.from({ length: props.total })}>
        {(_, index) => (
          <button
            type="button"
            role="tab"
            aria-selected={index() === props.activeIndex}
            aria-label={`Slide ${index() + 1} of ${props.total}`}
            class={`social-dot ${index() === props.activeIndex ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              props.onSelect(index());
            }}
          />
        )}
      </For>
    </div>
  );
};
