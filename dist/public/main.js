"use strict"
const config = HFS.getPluginConfig()
const allowedUsers = config.allowedUsers || []

if (
  allowedUsers.length > 0 &&
  allowedUsers.some((user) => HFS.userBelongsTo(user))
) {
  createTerminalButton()
}

function createTerminalButton() {
  const button = document.createElement("button")
  button.title = "Open Terminal"
  button.id = "terminal-btn"
  button.className = "terminal-floating-btn"

  document.body.appendChild(button)

  let terminalOpen = false
  let currentSessionId = null
  let overlay = null
  let terminal = null

  function isSmallScreen() {
    return window.innerWidth <= 672
  }

  function updateTerminalSize() {
    if (!terminal) return

    if (isSmallScreen()) {
      terminal.style.width = "100%"
      terminal.style.height = "100%"
      terminal.style.maxWidth = "none"
      terminal.style.borderRadius = "0"
    } else {
      terminal.style.width = "80%"
      terminal.style.height = "70%"
      terminal.style.maxWidth = "800px"
      terminal.style.borderRadius = "8px"
    }
  }

  button.addEventListener("click", async () => {
    if (terminalOpen) return
    terminalOpen = true

    overlay = document.createElement("div")
    overlay.id = "terminal-overlay"
    overlay.style.opacity = "0"
    overlay.style.transform = "translateY(100%)"

    terminal = document.createElement("div")
    terminal.className = "terminal-window"
    terminal.style.transform = "translateY(100%)"
    terminal.style.opacity = "0"

    updateTerminalSize()

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

    const handleResize = () => {
      updateTerminalSize()
    }
    window.addEventListener("resize", handleResize)

    requestAnimationFrame(() => {
      overlay.style.transition =
        "opacity 0.3s ease-out, transform 0.3s ease-out"
      terminal.style.transition = "all 0.3s ease-out"

      overlay.style.opacity = "1"
      overlay.style.transform = "translateY(0)"
      terminal.style.transform = "translateY(0)"
      terminal.style.opacity = "1"
    })

    try {
      const result = await HFS.customRestCall("startSession")
      if (result.success) {
        currentSessionId = result.sessionId
        if (result.initialOutput) {
          content.textContent = result.initialOutput
        }

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

    const performClose = () => {
      if (currentSessionId) {
        HFS.customRestCall("closeSession", { sessionId: currentSessionId })
        currentSessionId = null
      }
      window.removeEventListener("resize", handleResize)
      if (overlay && overlay.parentNode) {
        document.body.removeChild(overlay)
      }
      terminalOpen = false
      overlay = null
      terminal = null
    }

    const closeTerminal = () => {
      if (!terminalOpen) return

      overlay.style.opacity = "0"
      overlay.style.transform = "translateY(100%)"
      terminal.style.transform = "translateY(100%)"
      terminal.style.opacity = "0"

      setTimeout(performClose, 300)
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

    setTimeout(() => input.focus(), 400)
  })
}
