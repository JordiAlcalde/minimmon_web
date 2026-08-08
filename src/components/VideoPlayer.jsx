import React, { useState, useEffect } from 'react';
import { Film, Play, ExternalLink, AlertTriangle } from 'lucide-react';
import { formatVideoEmbedUrl } from '../utils/mediaUtils';

export default function VideoPlayer({ url, title = 'Vídeo' }) {
  const [hasError, setHasError] = useState(false);
  const [isYoutubeOrVimeo, setIsYoutubeOrVimeo] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [videoDimensions, setVideoDimensions] = useState(null);

  useEffect(() => {
    setHasError(false);
    setVideoDimensions(null);
    if (!url) return;

    const lower = url.toLowerCase();
    const isEmbed = lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com');
    setIsYoutubeOrVimeo(isEmbed);
    setEmbedUrl(formatVideoEmbedUrl(url));
  }, [url]);

  if (!url) return null;

  const handleLoadedMetadata = (e) => {
    const { videoWidth, videoHeight } = e.target;
    if (videoWidth && videoHeight) {
      const isVertical = videoHeight > videoWidth * 1.05;
      const isSquare = Math.abs(videoWidth - videoHeight) / Math.max(videoWidth, videoHeight) < 0.08;
      setVideoDimensions({ videoWidth, videoHeight, isVertical, isSquare });
    }
  };

  // Render YouTube or Vimeo iframe (16:9 widescreen)
  if (isYoutubeOrVimeo) {
    return (
      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-outline/20 shadow-md">
        <iframe 
          src={embedUrl} 
          title={title}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  // Determine dynamic container sizing:
  let containerSizing = "w-full aspect-video"; // default for landscape
  if (videoDimensions) {
    if (videoDimensions.isVertical) {
      containerSizing = "w-full max-w-sm md:max-w-md h-[480px] md:h-[560px] mx-auto";
    } else if (videoDimensions.isSquare) {
      containerSizing = "w-full max-w-lg aspect-square mx-auto";
    }
  }

  // HTML5 MP4 Player with Dynamic Aspect Ratio Adaptation
  return (
    <div className={`relative rounded-lg overflow-hidden bg-surface-container/60 border border-outline/15 shadow-md flex items-center justify-center transition-all duration-500 ease-in-out ${containerSizing}`}>
      {hasError ? (
        <div className="p-6 text-center text-on-primary max-w-md space-y-3 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-base text-amber-200">No s'ha pogut carregar el vídeo directament</h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            Pots obrir el vídeo directament per visualitzar-lo o revisar la URL introduïda.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <a 
              href={embedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shadow cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Obrir / Reproduir Vídeo en una nova pestanya</span>
            </a>
          </div>
        </div>
      ) : (
        <video 
          key={embedUrl}
          src={embedUrl}
          controls 
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onError={() => setHasError(true)}
          className="w-full h-full object-contain bg-black rounded-lg"
        >
          El teu navegador no suporta la reproducció de vídeos HTML5.
        </video>
      )}
    </div>
  );
}
