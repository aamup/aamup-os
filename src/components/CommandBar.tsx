import { useState, type FormEvent } from 'react'

export function CommandBar() {
  const [command, setCommand] = useState('')
  const [lastCommand, setLastCommand] = useState('type "help" to inspect available commands')

  function submit(event: FormEvent) {
    event.preventDefault()
    const clean = command.trim()
    if (!clean) return

    if (clean.toLowerCase() === 'help') {
      setLastCommand('v0.1 shell: system / modules / status — command routing lands in v0.2')
    } else {
      setLastCommand(`queued: ${clean} — command router not connected yet`)
    }

    setCommand('')
  }

  return (
    <form className="command-bar" onSubmit={submit}>
      <span className="command-bar__prompt">›</span>
      <input
        aria-label="AAMUP OS command"
        autoComplete="off"
        spellCheck={false}
        value={command}
        onChange={(event) => setCommand(event.target.value)}
        placeholder="ASK AAMUP OR ENTER COMMAND"
      />
      <span className="command-bar__hint">{lastCommand}</span>
    </form>
  )
}
