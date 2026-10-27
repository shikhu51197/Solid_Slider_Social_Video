/** Shared English copy. Keep translation concerns out of API data. */
export const UI_TEXT = {
  dislikePost: 'Dislike post',
  seeMore: 'see more', seeLess: 'see less',
  viewPost: 'View post', postMedia: 'Post media', likePost: 'Like post', commentPost: 'Comment on post',
  sharePost: 'Share post', bookmarkPost: 'Bookmark post', pagination: 'Social slides pagination',
  profileLabel: (name: string) => `View ${name}'s profile`,
  avatarLabel: (name: string) => `${name} avatar`,
  slideLabel: (index: number, total: number) => `Slide ${index} of ${total}`,
  feedUnavailableTitle: (platform: string) => `${platform} Content Unavailable`,
  emptyFeed: (platform: string) => `No ${platform} posts are available right now. Please check again shortly.`,
  failedFeed: (platform: string) => `Unable to load ${platform} posts. Please try again shortly.`,
  heading: 'Latest from social', viewProfile: 'View profile', unavailable: 'Unavailable',
  unavailableTitle: 'Content Unavailable', unavailableMessage: 'Unable to load social content.',
  retry: 'Retry Connection', retrying: 'Retrying…', likesUnavailable: 'Likes unavailable',
  viewMore: { instagram: 'View more on instagram', youtube: 'View more on YouTube', facebook: 'View more on Facebook' },
  slideTransition: 'transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1)',
};
