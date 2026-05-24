import React from 'react';
import { getYoutubeId } from '../utils/helpers.js';
export default function VideoPlayer({ url }) {
  if (!url) return null;
  const ytId = getYoutubeId(url);
  if (ytId) {
    return (
      <div className="video-wrapper">
        <iframe src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen title="video" />
      </div>
    );
  }
  // Direct video file
  return (
    <div className="video-wrapper">
      <video controls src={url} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', borderRadius:'var(--radius)' }}>
        Your browser does not support video.
      </video>
    </div>
  );
}
