import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import type { User } from '../../../shared/types'

export function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser, setSettings, setSyncStatus } = useAuthStore()

  useEffect(() => {
    api.settings.get().then(res => {
      if (res.success && res.data) setSettings(res.data as Record<string, string>)
    })
    api.sync.getStatus().then(status => setSyncStatus(status))
    const unsub = api.sync.onStatusChanged(setSyncStatus)
    return unsub
  }, [setSettings, setSyncStatus])

  const handlePin = async (digit: string) => {
    const next = pin + digit
    setPin(next)
    setError('')
    if (next.length >= 4) {
      setLoading(true)
      const res = await api.users.authenticate(next)
      setLoading(false)
      if (res.success && res.data) {
        setUser(res.data as User)
      } else {
        setError('Invalid PIN')
        setTimeout(() => setPin(''), 600)
      }
    }
  }

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #111111 0%, #1e1e1e 50%, #2a1a0e 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-80" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,123,53,0.15)' }}>
        <div className="text-center mb-6">
          <div className="mb-3">
            <div className="text-2xl font-extrabold tracking-wider leading-tight">
              <span style={{ color: '#d97b35' }}>SPACE</span><span className="text-gray-900">CODE</span>
            </div>
            <div className="text-xs font-semibold tracking-widest text-gray-400 uppercase mt-0.5">Technologies</div>
          </div>
          <div className="w-12 h-px mx-auto my-3" style={{ background: '#d97b35' }} />
          <h1 className="text-lg font-bold text-gray-800">Space-Business POS</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your PIN to continue</p>
        </div>

        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors`}
              style={i < pin.length
                ? { backgroundColor: '#d97b35', borderColor: '#d97b35' }
                : { borderColor: '#d1d5db' }
              }
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-500 text-sm mb-4">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <button
              key={i}
              onClick={() => {
                if (d === '⌫') { setPin(p => p.slice(0, -1)); setError('') }
                else if (d !== '') handlePin(d)
              }}
              disabled={loading || (d === '' )}
              className={`h-14 rounded-xl font-semibold text-lg transition-all ${
                d === ''
                  ? 'pointer-events-none'
                  : d === '⌫'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                  : 'bg-gray-100 text-gray-800 active:scale-95'
              }`}
              style={d !== '' && d !== '⌫' ? {
                transition: 'background-color 0.15s, transform 0.1s',
              } : undefined}
              onMouseEnter={e => {
                if (d !== '' && d !== '⌫') {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#fbe5cc'
                  ;(e.target as HTMLButtonElement).style.color = '#c4621c'
                }
              }}
              onMouseLeave={e => {
                if (d !== '' && d !== '⌫') {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6'
                  ;(e.target as HTMLButtonElement).style.color = '#1f2937'
                }
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Default admin PIN: 1234</p>
      </div>
    </div>
  )
}
