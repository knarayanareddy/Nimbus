'use client'

import { useEffect, useRef } from 'react'

interface Drop {
  x: number
  y: number
  speed: number
  length: number
  opacity: number
}

export default function RainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const dropsRef = useRef<Drop[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initDrops()
    }

    const initDrops = () => {
      const count = Math.floor((canvas.width * canvas.height) / 12000)
      dropsRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 1.5 + Math.random() * 2.5,
        length: 12 + Math.random() * 20,
        opacity: 0.1 + Math.random() * 0.4,
      }))
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dropsRef.current.forEach((drop) => {
        ctx.beginPath()
        ctx.moveTo(drop.x, drop.y)
        ctx.lineTo(drop.x - drop.length * 0.2, drop.y + drop.length)
        ctx.strokeStyle = `rgba(97, 116, 245, ${drop.opacity})`
        ctx.lineWidth = 0.8
        ctx.stroke()

        drop.y += drop.speed
        drop.x -= drop.speed * 0.2

        if (drop.y > canvas.height) {
          drop.y = -drop.length
          drop.x = Math.random() * canvas.width
        }
      })

      animRef.current = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    draw()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.18,
      }}
    />
  )
}
