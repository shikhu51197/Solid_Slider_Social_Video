/** Fields consumed from upstream APIs; unavailable optional fields stay absent. */
export interface GraphError {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
}

export interface InstagramProfile {
  id?: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

interface Thumbnail { url?: string }
interface YouTubeSnippet {
  title?: string;
  description?: string;
  customUrl?: string;
  publishedAt?: string;
  thumbnails?: Partial<Record<'default' | 'medium' | 'high' | 'standard' | 'maxres', Thumbnail>>;
}
export interface YouTubeChannel {
  snippet?: YouTubeSnippet;
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
  statistics?: { subscriberCount?: string };
}
export interface YouTubeVideo {
  id: string;
  snippet?: YouTubeSnippet;
  statistics?: { likeCount?: string; viewCount?: string; commentCount?: string };
}
export interface YouTubePlaylistItem { contentDetails?: { videoId?: string } }

interface FacebookAttachment {
  type?: string;
  url?: string;
  title?: string;
  description?: string;
  target?: { id?: string };
  media?: { image?: { src?: string } };
}
interface Engagement { summary?: { total_count?: number } }
export interface FacebookNode {
  id: string;
  error?: GraphError;
  name?: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  full_picture?: string;
  title?: string;
  description?: string;
  source?: string;
  views?: number;
  link?: string;
  followers_count?: number;
  is_verified?: boolean;
  picture?: { data?: { url?: string } };
  images?: Array<{ width: number; height: number; source: string }>;
  likes?: Engagement;
  comments?: Engagement;
  attachments?: { data?: FacebookAttachment[] };
  from?: { id?: string; name?: string; picture?: { data?: { url?: string } } };
}
export interface FacebookResponse {
  error?: GraphError;
  data?: FacebookNode[];
}
