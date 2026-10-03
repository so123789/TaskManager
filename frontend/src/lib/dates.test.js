import { dueKey, localKey, isOverdue, daysFromToday, dueLabel, monthGrid, tzOffset, addDays } from './dates'

const keyFromToday = (days) => localKey(addDays(new Date(), days))
// Due dates arrive from the API as UTC midnight of the chosen calendar day
const stored = (key) => `${key}T00:00:00.000Z`

describe('date helpers', () => {
    test('dueKey reads the calendar day regardless of timezone', () => {
        expect(dueKey('2026-03-09T00:00:00.000Z')).toBe('2026-03-09')
        expect(dueKey(null)).toBe('')
    })

    test('a task due today is not overdue, yesterday is', () => {
        expect(isOverdue({ dueDate: stored(keyFromToday(0)), status: 'todo' })).toBe(false)
        expect(isOverdue({ dueDate: stored(keyFromToday(-1)), status: 'in_progress' })).toBe(true)
    })

    test('completed or undated tasks are never overdue', () => {
        expect(isOverdue({ dueDate: stored(keyFromToday(-5)), status: 'completed' })).toBe(false)
        expect(isOverdue({ status: 'todo' })).toBe(false)
    })

    test('relative due labels', () => {
        expect(dueLabel(stored(keyFromToday(0)))).toBe('Today')
        expect(dueLabel(stored(keyFromToday(1)))).toBe('Tomorrow')
        expect(dueLabel(stored(keyFromToday(-1)))).toBe('Yesterday')
        expect(dueLabel(stored(keyFromToday(-3)))).toBe('3 days ago')
        expect(daysFromToday(stored(keyFromToday(10)))).toBe(10)
    })

    test('month grid is 6 full weeks starting on Monday and covers the month', () => {
        const grid = monthGrid(2026, 1) // February 2026
        expect(grid).toHaveLength(42)
        expect(grid[0].getDay()).toBe(1)
        expect(grid.some(d => d.getMonth() === 1 && d.getDate() === 1)).toBe(true)
        expect(grid.some(d => d.getMonth() === 1 && d.getDate() === 28)).toBe(true)
    })

    test('tzOffset is formatted as ±HH:MM', () => {
        expect(tzOffset()).toMatch(/^[+-]\d{2}:\d{2}$/)
    })
})
