import { cx, initials, colorFor, plural, idOf } from './utils'

describe('utils', () => {
    test('cx joins truthy class names', () => {
        expect(cx('a', false, 'b', null, undefined, 'c')).toBe('a b c')
    })

    test('initials uses first and last name', () => {
        expect(initials('Ada Lovelace')).toBe('AL')
        expect(initials('Grace Brewster Hopper')).toBe('GH')
        expect(initials('cher')).toBe('C')
        expect(initials('')).toBe('?')
    })

    test('colorFor is stable for the same seed', () => {
        expect(colorFor('user-1')).toBe(colorFor('user-1'))
        expect(colorFor('user-1')).toMatch(/^#[0-9a-f]{6}$/i)
    })

    test('plural', () => {
        expect(plural(1, 'task')).toBe('1 task')
        expect(plural(3, 'task')).toBe('3 tasks')
    })

    test('idOf handles populated documents and raw ids', () => {
        expect(idOf({ _id: 'x' })).toBe('x')
        expect(idOf({ id: 'y' })).toBe('y')
        expect(idOf('z')).toBe('z')
    })
})
