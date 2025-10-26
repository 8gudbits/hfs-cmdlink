"use strict"
const config = HFS.getPluginConfig()
const allowedUsers = config.allowedUsers || []

// Only show terminal button if user has permission
if (
  allowedUsers.length > 0 &&
  allowedUsers.some((user) => HFS.userBelongsTo(user))
) {
  createTerminalButton()
}

function createTerminalButton() {
  const button = document.createElement("button")
  button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <line x1="6" y1="8" x2="18" y2="8"></line>
            <line x1="6" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="16" x2="12" y2="16"></line>
        </svg>
    `
  button.title = "Open Terminal"
  button.id = "terminal-btn"
  button.className = "terminal-floating-btn"

  document.body.appendChild(button)

  let terminalOpen = false
  let currentSessionId = null

  button.addEventListener("click", async () => {
    if (terminalOpen) return
    terminalOpen = true

    const overlay = document.createElement("div")
    overlay.id = "terminal-overlay"

    const terminal = document.createElement("div")
    terminal.className = "terminal-window"

    const header = document.createElement("div")
    header.className = "terminal-header"
    header.innerHTML = `
            <span>Terminal</span>
            <button class="close-terminal">×</button>
        `

    const content = document.createElement("div")
    content.id = "terminal-content"
    content.textContent = ""

    const inputContainer = document.createElement("div")
    inputContainer.className = "terminal-input-container"
    inputContainer.innerHTML = `
            <input type="text" class="terminal-input" placeholder="Type a command...">
        `

    terminal.appendChild(header)
    terminal.appendChild(content)
    terminal.appendChild(inputContainer)
    overlay.appendChild(terminal)
    document.body.appendChild(overlay)

    try {
      // Start new shell session for this terminal instance
      const result = await HFS.customRestCall("startSession")
      if (result.success) {
        currentSessionId = result.sessionId
        if (result.initialOutput) {
          content.textContent = result.initialOutput
        }

        // Listen for real-time shell output via notifications
        HFS.getNotifications(currentSessionId, (eventName, data) => {
          if (eventName === "output") {
            content.textContent += data
            content.scrollTop = content.scrollHeight
          } else if (eventName === "closed") {
            currentSessionId = null
          }
        })
      } else {
        content.textContent = result.output
      }
    } catch (error) {
      content.textContent = "Network error: " + error
    }

    const closeTerminal = () => {
      if (currentSessionId) {
        HFS.customRestCall("closeSession", { sessionId: currentSessionId })
        currentSessionId = null
      }
      document.body.removeChild(overlay)
      terminalOpen = false
    }

    header
      .querySelector(".close-terminal")
      .addEventListener("click", closeTerminal)

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeTerminal()
      }
    })

    const input = terminal.querySelector(".terminal-input")
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const command = input.value.trim()
        if (!command) return

        // Handle clear command locally
        if (command === "clear" || command === "cls") {
          content.textContent = ""
          input.value = ""
          return
        }

        if (currentSessionId) {
          try {
            const result = await HFS.customRestCall("executeCommand", {
              sessionId: currentSessionId,
              command: command,
            })
            if (!result.success) {
              content.textContent += result.output + "\n"
            }
          } catch (error) {
            content.textContent += "Network error: " + error + "\n"
          }
        }

        input.value = ""
        content.scrollTop = content.scrollHeight
      }
    })

    setTimeout(() => input.focus(), 100)
  })
}

