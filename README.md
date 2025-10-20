
<div align="center">

# 🚀 FkNeoInstaller

[![GitHub Stars](https://img.shields.io/github/stars/flashcodes-themayankjha/fkneo-cli.svg?style=social)](https://github.com/flashcodes-themayankjha/fkneo-cli)
[![npm Version](https://img.shields.io/npm/v/fkneo-installer.svg?color=brightgreen)](https://www.npmjs.com/package/fkneo-installer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Your dynamic Neovim setup wizard.**

</div>



## 🧩 Why FkNeoInstaller?

`FkNeoInstaller` is a powerful command-line tool that simplifies setting up and managing your Neovim configuration.  
Whether you’re a seasoned developer or new to Neovim, **FkNeoInstaller** helps you create a feature-rich, personalized environment in minutes — no manual setup required.

---

## ✨ Features


  <img width="700" src="https://github.com/user-attachments/assets/1c5b83eb-0eb6-4fe6-9590-fa78684b5913" alt="FkNeoInstaller CLI Preview" />


- 🚀 **Interactive Setup:** Guided wizard to configure Neovim from scratch.
- 📦 **Pre-built Configurations:** One-command install for popular Neovim setups:
  - **FkVim**
  - **LazyVim**
  - **NvChad**
  - **LunarVim**
- 🎨 **Custom Generator:** Generate a tailored Neovim configuration for your workflow.
- 🧹 **Clean & Reset:** Remove installed configurations and manage shell aliases easily.
- 🔒 **GitHub Authentication:** Securely connect to GitHub to use private configs.

---

## ⚙️ Installation

Install **FkNeoInstaller** globally using your preferred package manager:

```bash
# With npm
npm install -g fkneo-installer

# With yarn
yarn global add fkneo-installer

# With pnpm
pnpm add -g fkneo-installer
````

---

## 🖥️ Usage

Launch the interactive CLI:

```bash
fkneo
```


  <img width="700" src="https://github.com/user-attachments/assets/3b6846ea-f956-403b-89da-52ed43dacf4c" alt="FkNeoInstaller Interactive CLI" />


Manage your Neovim setup directly from the terminal.

  <img width="700" src="https://github.com/user-attachments/assets/8da052b2-5d15-4f71-b02e-1fb27e988252" alt="FkNeoInstaller Menu" />
  <img width="700" src="https://github.com/user-attachments/assets/b75914a9-2dc3-40f7-afd3-e1b73d433a54" alt="FkNeoInstaller Example" />


---

## ⚡ Quick Install

For non-interactive setup, use:

```bash
fkneo install <preset> [options]
```


  <img width="700" src="https://github.com/user-attachments/assets/cb0e99db-5b1a-46af-a43a-fe6eb7c2b3a0" alt="FkNeoInstaller Quick Install" />


**Examples:**

```bash
# Install FkVim
fkneo install --fkvim

# Install LazyVim and set it as the main config
fkneo install --lazyvim --main

# Install NvChad with a custom alias
fkneo install --nvchad --alias mychad
```

---

## 🧰 Commands

| Command         | Description                                     |
| --------------- | ----------------------------------------------- |
| `help`          | Show the help menu with all available commands. |
| `setup`         | Launch the interactive setup wizard.            |
| `install`       | Install a pre-built Neovim configuration.       |
| `generate`      | Generate a custom Neovim configuration.         |
| `clean`         | Remove installed presets and clean up aliases.  |
| `reset-auth`    | Clear saved GitHub credentials.                 |
| `quit` / `exit` | Exit the CLI.                                   |

---

## 🧾 Configuration

FkNeoInstaller stores its configuration in:

```
~/.config/FkNeoInstaller/config.json
```

This includes authentication tokens and metadata about your installed setups.
You can clear it anytime using the `reset-auth` command.

---

## 🤝 Contributing

Contributions are welcome!
If you have ideas, issues, or improvements — please open a PR or create an issue on [GitHub](https://github.com/flashcodes-themayankjha/fkneo-cli).

---

## 📜 License

Licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/flashcodes-themayankjha">Mayank Jha</a> — Part of the <a href="https://github.com/TheFlashCodes">FkVim Ecosystem</a>.</sub>
</div>



