import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const HERO_VIDEO = '/background-windows.mp4'
const HERO_VIDEO_MOBILE = '/hero-barbershop-mobile.mp4'
const HERO_IMG = '/background-windows-img.png'
const HERO_IMG_MOBILE = '/background-img-mobile.jpg'
const PLAYBACK_RATE = 0.5
// Matches Tailwind's md breakpoint, so the switch lines up with the layout.
const MOBILE_QUERY = '(max-width: 767px)'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const handleChange = (event) => setIsMobile(event.matches)
    setIsMobile(query.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return isMobile
}

// Looping barbershop backdrop shared by the platform home page and every salon
// page. Shows a static image immediately, then loads the video in the background.
// Once the video is ready to play, it fades in over the image.
export default function VideoHero({ poster, alt = '' }) {
  const reduceMotion = useReducedMotion()
  const isMobile = useIsMobile()
  const video = useRef(null)
  const [videoReady, setVideoReady] = useState(false)

  const videoSrc = isMobile ? HERO_VIDEO_MOBILE : HERO_VIDEO
  const imgSrc = poster || (isMobile ? HERO_IMG_MOBILE : HERO_IMG)

  useEffect(() => {
    setVideoReady(false)
  }, [videoSrc])

  useEffect(() => {
    if (video.current) video.current.playbackRate = PLAYBACK_RATE
  }, [videoSrc, reduceMotion])

  const handleCanPlay = () => {
    if (video.current) video.current.playbackRate = PLAYBACK_RATE
    setVideoReady(true)
  }

  const [imgLoaded, setImgLoaded] = useState(false)

  return (
    <div className="absolute inset-0 z-0" style={{ backgroundColor: '#12110f' }}>
      {/* Static image shown immediately */}
      <img
        src={imgSrc}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'} ${!isMobile ? 'scale-[0.99]' : ''}`}
        onLoad={() => setImgLoaded(true)}
      />

      {/* Video loads in background, fades in when ready */}
      {!reduceMotion && (
        <video
          key={videoSrc}
          ref={video}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={handleCanPlay}
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 via-40% to-transparent" />
    </div>
  )
}
