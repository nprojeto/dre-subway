type Toast = { id: number; text: string; kind: 'ok' | 'bad' | 'info' }

export const useToast = () => {
  const list = useState<Toast[]>('toasts', () => [])
  const push = (text: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random()
    list.value.push({ id, text, kind })
    setTimeout(() => (list.value = list.value.filter((t) => t.id !== id)), kind === 'bad' ? 6000 : 3500)
  }
  return {
    list,
    ok: (t: string) => push(t, 'ok'),
    bad: (t: string | Error) => push(typeof t === 'string' ? t : t.message, 'bad'),
    info: (t: string) => push(t, 'info'),
  }
}
