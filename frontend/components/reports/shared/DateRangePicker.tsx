/**
 * DateRangePicker Component
 * Allows users to select a date range with quick presets
 */

'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from 'lucide-react'

interface DateRangePickerProps {
  startDate?: string
  endDate?: string
  onRangeChange: (startDate: string, endDate: string) => void
  className?: string
}

type DatePreset = 'custom' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year'

const getPresetDates = (preset: DatePreset): { start: string; end: string } | null => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case 'today':
      return {
        start: today.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      }

    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        start: yesterday.toISOString().split('T')[0],
        end: yesterday.toISOString().split('T')[0],
      }
    }

    case 'this_week': {
      const firstDay = new Date(today)
      firstDay.setDate(today.getDate() - today.getDay())
      return {
        start: firstDay.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      }
    }

    case 'last_week': {
      const lastWeekEnd = new Date(today)
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1)
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
      return {
        start: lastWeekStart.toISOString().split('T')[0],
        end: lastWeekEnd.toISOString().split('T')[0],
      }
    }

    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        start: firstDay.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      }
    }

    case 'last_month': {
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return {
        start: lastMonthStart.toISOString().split('T')[0],
        end: lastMonthEnd.toISOString().split('T')[0],
      }
    }

    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3)
      const firstDay = new Date(today.getFullYear(), quarter * 3, 1)
      return {
        start: firstDay.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      }
    }

    case 'this_year': {
      const firstDay = new Date(today.getFullYear(), 0, 1)
      return {
        start: firstDay.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      }
    }

    default:
      return null
  }
}

export function DateRangePicker({
  startDate = '',
  endDate = '',
  onRangeChange,
  className,
}: DateRangePickerProps) {
  const [preset, setPreset] = useState<DatePreset>('custom')
  const [localStartDate, setLocalStartDate] = useState(startDate)
  const [localEndDate, setLocalEndDate] = useState(endDate)

  const handlePresetChange = (value: DatePreset) => {
    setPreset(value)
    if (value === 'custom') {
      return
    }

    const dates = getPresetDates(value)
    if (dates) {
      setLocalStartDate(dates.start)
      setLocalEndDate(dates.end)
      onRangeChange(dates.start, dates.end)
    }
  }

  const handleStartDateChange = (value: string) => {
    setLocalStartDate(value)
    setPreset('custom')
    if (value && localEndDate) {
      onRangeChange(value, localEndDate)
    }
  }

  const handleEndDateChange = (value: string) => {
    setLocalEndDate(value)
    setPreset('custom')
    if (localStartDate && value) {
      onRangeChange(localStartDate, value)
    }
  }

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-3">
        {/* Preset Selector */}
        <div className="space-y-2">
          <Label htmlFor="date-preset">Período</Label>
          <Select value={preset} onValueChange={handlePresetChange}>
            <SelectTrigger id="date-preset">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="yesterday">Ayer</SelectItem>
              <SelectItem value="this_week">Esta semana</SelectItem>
              <SelectItem value="last_week">Semana pasada</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes pasado</SelectItem>
              <SelectItem value="this_quarter">Este trimestre</SelectItem>
              <SelectItem value="this_year">Este año</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="start-date">Fecha inicio</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="start-date"
              type="date"
              value={localStartDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="end-date">Fecha fin</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              id="end-date"
              type="date"
              value={localEndDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="pl-10"
              min={localStartDate}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
