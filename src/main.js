"use strict";
const config = HFS.getPluginConfig(); // Check access
const allowedUsers = config.allowedUsers || [];

// If users configured, check if current user has access
if (
  allowedUsers.length > 0 &&
  allowedUsers.some((user) => HFS.userBelongsTo(user))
) {
  createTerminalButton();
}

function createTerminalButton() {
  const button = document.createElement("button");
  button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <line x1="6" y1="8" x2="18" y2="8"></line>
            <line x1="6" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="16" x2="12" y2="16"></line>
        </svg>
    `;
  button.title = "Open Terminal";
  button.id = "terminal-btn";
  button.className = "terminal-floating-btn";

  document.body.appendChild(button);

  let terminalOpen = false;

  button.addEventListener("click", () => {
    if (terminalOpen) return;
    terminalOpen = true;

    const overlay = document.createElement("div");
    overlay.id = "terminal-overlay";

    const terminal = document.createElement("div");
    terminal.className = "terminal-window";

    const header = document.createElement("div");
    header.className = "terminal-header";
    header.innerHTML = `
            <span>Terminal</span>
            <button class="close-terminal">×</button>
        `;

    const content = document.createElement("div");
    content.id = "terminal-content";
    content.textContent = "Welcome to HFS Terminal\nType commands below:\n\n$ ";

    const inputContainer = document.createElement("div");
    inputContainer.className = "terminal-input-container";
    inputContainer.innerHTML = `
            <span class="prompt">$</span>
            <input type="text" class="terminal-input" placeholder="Type a command...">
        `;

    terminal.appendChild(header);
    terminal.appendChild(content);
    terminal.appendChild(inputContainer);
    overlay.appendChild(terminal);
    document.body.appendChild(overlay);

    header.querySelector(".close-terminal").addEventListener("click", () => {
      document.body.removeChild(overlay);
      terminalOpen = false;
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        terminalOpen = false;
      }
    });

    const input = terminal.querySelector(".terminal-input");
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const command = input.value.trim();
        if (!command) return;

        content.textContent += command + "\n";

        if (command === "clear" || command === "cls") {
          content.textContent = "$ ";
          input.value = "";
          return;
        }

        try {
          const result = await HFS.customRestCall("executeCommand", {
            command,
          });
          if (result && result.output) {
            content.textContent += result.output + "\n";
          }
        } catch (error) {
          content.textContent += `Error: ${error}\n`;
        }

        content.textContent += "$ ";
        input.value = "";
        content.scrollTop = content.scrollHeight;
      }
    });

    setTimeout(() => input.focus(), 100);
  });
}

