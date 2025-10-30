exports.repo = "8gudbits/hfs-cmdlink"
exports.version = 1.3
exports.description = "Execute commands on the server from the frontend."
exports.preview = "https://github.com/8gudbits/hfs-cmdlink/raw/main/preview.png"
exports.apiRequired = 10.3
exports.frontend_js = "main.js"
exports.frontend_css = "style.css"
exports.changelog = [
  { "version": 1.3, "message": "Bugfix: Resolved 'Identifier has already been declared' JavaScript error" },
  { "version": 1.2, "message": "Added persistent shell sessions and improved terminal behavior" },
  { "version": 1.1, "message": "CRITICAL FIX: Added backend permission verification (Please UPDATE!)" },
  { "version": 1.0, "message": "Initial release with basic command execution functionality" }
]

exports.config = {
  allowedUsers: {
    type: "username",
    multiple: true,
    label: "Allowed Users",
    helperText: "Select users/groups who can access the terminal. If empty, NO ONE can access it.",
    frontend: true,
  },
}

const { spawn } = require("child_process")

exports.init = function (api) {
  const sessions = new Map()

  // Check if current user has permission to use terminal
  function hasRunPermission(ctx) {
    const pluginConfig = api.getConfig()
    const allowedUsers = pluginConfig.allowedUsers || []

    if (allowedUsers.length === 0) {
      return false
    }

    const currentUser = api.getCurrentUsername(ctx)
    if (!currentUser) {
      return false
    }

    return allowedUsers.some((user) => api.ctxBelongsTo(ctx, user))
  }

  exports.customRest = {
    async startSession(params, ctx) {
      if (!hasRunPermission(ctx))
        return {
          success: false,
          output: "You don't have permission to run commands",
        }

      const sessionId = Math.random().toString(36).substr(2, 9)
      const shell = spawn(process.platform === "win32" ? "cmd" : "bash")

      let initialOutput = ""
      let initialResolved = false

      // Handle shell output - separate initial from real-time
      shell.stdout.on("data", (data) => {
        const output = data.toString()
        if (!initialResolved) {
          initialOutput += output
        } else {
          api.notifyClient(sessionId, "output", output)
        }
      })

      shell.stderr.on("data", (data) => {
        const output = data.toString()
        if (!initialResolved) {
          initialOutput += output
        } else {
          api.notifyClient(sessionId, "output", output)
        }
      })

      shell.on("close", () => {
        api.notifyClient(sessionId, "closed", "")
        sessions.delete(sessionId)
      })

      // Wait for initial shell output before marking as ready
      setTimeout(() => {
        initialResolved = true
        sessions.set(sessionId, shell)
      }, 100)

      return {
        success: true,
        sessionId,
        initialOutput: initialOutput,
      }
    },

    async executeCommand(params, ctx) {
      if (!hasRunPermission(ctx))
        return {
          success: false,
          output: "You don't have permission to run commands",
        }

      const { sessionId, command } = params
      const shell = sessions.get(sessionId)
      if (!shell) {
        return { success: false, output: "Session not found" }
      }

      shell.stdin.write(command + "\n")
      return { success: true }
    },

    async closeSession(params, ctx) {
      const { sessionId } = params
      const shell = sessions.get(sessionId)
      if (shell) {
        shell.kill()
        sessions.delete(sessionId)
      }
      return { success: true }
    },
  }

  return {
    unload() {
      // Clean up all shell sessions when plugin unloads
      sessions.forEach((shell) => shell.kill())
      sessions.clear()
    },
  }
}

