import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const HERO_VIDEO = '/background-windows.mp4'
const HERO_VIDEO_MOBILE = '/hero-barbershop-mobile.mp4'
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
// page. Mobile gets a portrait cut of the clip; visitors who ask for reduced
// motion get the poster still instead, so the video is never downloaded.
export default function VideoHero({ poster, alt = '' }) {
  const reduceMotion = useReducedMotion()
  const isMobile = useIsMobile()
  const video = useRef(null)
  const src = isMobile ? HERO_VIDEO_MOBILE : HERO_VIDEO

  // playbackRate is not an attribute, and it resets whenever the source
  // changes, so it is reapplied here.
  useEffect(() => {
    if (video.current) video.current.playbackRate = PLAYBACK_RATE
  }, [src, reduceMotion])

  return (
    <div className="absolute inset-0 z-0">
      {reduceMotion ? (
        poster ? <img src={poster} alt={alt} className="w-full h-full object-cover" /> : null
      ) : (
        <video
          key={src}
          ref={video}
          className="w-full h-full object-cover"
          src={src}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      {/* Only the bottom is darkened, so the headline stays readable without
          dulling the whole clip. */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 via-40% to-transparent" />
    </div>
  )
}
