exports.repo = "8gudbits/hfs-cmdlink"
exports.version = 1.0
exports.description = "Execute commands on the server from the frontend."
exports.preview = "https://github.com/8gudbits/hfs-cmdlink/raw/main/preview.png"
exports.apiRequired = 8.23
exports.frontend_js = "main.js"
exports.frontend_css = "style.css"

exports.config = {
  allowedUsers: {
    type: "username",
    multiple: true,
    label: "Allowed Users",
    helperText: "Select users/groups who can access the terminal. If empty, NO ONE can access it.",
    frontend: true,
  },
}

const { exec } = require("child_process")

exports.init = function (api) {
  exports.customRest = {
    async executeCommand({ command }) {
      return new Promise((resolve) => {
        if (!command) {
          return resolve({ success: false, output: "Empty command" })
        }

        exec(command, (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              output: stderr || error.message,
            })
          } else {
            resolve({
              success: true,
              output: stdout,
            })
          }
        })
      })
    },
  }
}

