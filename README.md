# FkNeo CLI

<p align="center">
  <a href="https://github.com/flashcodes-themayankjha/fkneo-cli">
    <img src="https://img.shields.io/github/stars/flashcodes-themayankjha/fkneo-cli.svg?style=social" alt="GitHub Stars">
  </a>
  <a href="https://www.npmjs.com/package/fkneo-cli">
    <img src="https://img.shields.io/npm/v/fkneo-cli.svg" alt="npm version">
  </a>
</p>

<p align="center">
  <b>Your dynamic Neovim setup wizard.</b>
</p>

---

## Why FkNeo CLI?

`fkneo-cli` is a powerful command-line tool that simplifies setting up and managing your Neovim configuration. Whether you're a seasoned developer or new to Neovim, FkNeo helps you get a feature-rich, customized environment running in minutes. Skip the manual setup and get back to coding.

## Features

- **🚀 Interactive Setup:** A guided wizard to configure Neovim from scratch.
- **📦 Pre-built Configurations:** One-command installation for popular Neovim setups:
  - **FkVim**
  - **LazyVim**
  - **NvChad**
  - **LunarVim**
- **🎨 Custom Generator:** Generate a personalized Neovim configuration tailored to your needs.
- **🧹 Clean & Reset:** Easily remove installed configurations and manage shell aliases.
- **🔒 GitHub Authentication:** Securely authenticate with GitHub to use private configurations.

## Installation

Install `fkneo-cli` globally using your favorite package manager:

```bash
# With npm
npm install -g fkneo-cli

# With yarn
yarn global add fkneo-cli

# With pnpm
pnpm add -g fkneo-cli
```

## Usage

Launch the interactive CLI by running:

```bash
fkneo
```

This will start the FkNeo CLI, where you can use various commands to manage your Neovim setup.

### Quick Install

For a non-interactive setup, use the `install` command with flags.

**Syntax:**
`fkneo install <preset> [options]`

**Examples:**
```bash
# Install FkVim
fkneo install --fkvim

# Install LazyVim and set it as the main config
fkneo install --lazyvim --main

# Install NvChad with a custom alias
fkneo install --nvchad --alias mychad
```

## Commands

| Command      | Description                                           |
| ------------ | ----------------------------------------------------- |
| `help`       | Show the help menu with all available commands.       |
| `setup`      | Launch the interactive setup wizard.                  |
| `install`    | Install a pre-built Neovim configuration.             |
| `generate`   | Generate a custom Neovim configuration.               |
| `clean`      | Remove installed presets and clean up aliases.        |
| `reset-auth` | Clear saved GitHub credentials.                       |
| `quit` / `exit`| Exit the CLI.                                         |

## Configuration

`fkneo-cli` stores its configuration in `~/.config/fkneo-cli/config.json`. This includes authentication tokens and metadata about your installed setups. You can clear this configuration using the `reset-auth` command.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

This project is licensed under the MIT License.